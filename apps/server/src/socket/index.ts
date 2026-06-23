import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { WebSocketServer, WebSocket } from "ws";
import { verifyToken, type JwtPayload } from "../auth/jwt.js";
import { URL } from "url";

/**
 * Map of online players: playerId → set of socket IDs.
 */
export const onlinePlayers = new Map<string, Set<string>>();

/**
 * Map of party rooms: partyId → set of player IDs.
 */
export const partyMembers = new Map<string, Set<string>>();

let io: Server | null = null;

export function getIO(): Server {
  if (!io) throw new Error("Socket.IO not initialized. Call initSocketIO first.");
  return io;
}

// ─── Godot WebSocket Server ─────────────────────────────────

let godotWS: WebSocketServer | null = null;
const godotClients = new Map<string, WebSocket>(); // playerId → ws

export function initGodotWebSocket(server: HttpServer): void {
  godotWS = new WebSocketServer({ server, path: "/godot" });

  godotWS.on("connection", (ws, req) => {
    const url = new URL(req.url || "", `http://${req.headers.host}`);
    const token = url.searchParams.get("token");
    if (!token) {
      ws.close(4001, "Auth required");
      return;
    }

    const payload = verifyToken(token);
    if (!payload) {
      ws.close(4001, "Invalid token");
      return;
    }

    const playerId = payload.id;
    const username = payload.username;
    godotClients.set(playerId, ws);
    console.log(`[Godot WS] ${username} (${playerId}) connected`);

    // Track online
    if (!onlinePlayers.has(playerId)) {
      onlinePlayers.set(playerId, new Set());
    }
    onlinePlayers.get(playerId)!.add(playerId);
    io?.emit("player:online", { playerId, username });

    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        handleGodotMessage(playerId, username, ws, msg);
      } catch (e) {
        // ignore invalid JSON
      }
    });

    ws.on("close", () => {
      godotClients.delete(playerId);
      onlinePlayers.get(playerId)?.delete(playerId);
      if (onlinePlayers.get(playerId)?.size === 0) {
        onlinePlayers.delete(playerId);
        io?.emit("player:offline", { playerId });
      }
      console.log(`[Godot WS] ${username} disconnected`);
    });
  });
}

function handleGodotMessage(playerId: string, username: string, ws: WebSocket, msg: any) {
  switch (msg.type) {
    case "party:join":
      for (const [pid, members] of partyMembers) {
        if (members.has(playerId)) {
          // Already in a party — send current party
          ws.send(JSON.stringify({ type: "party:state", partyId: pid }));
          return;
        }
      }
      break;

    case "party:update-role": {
      const { partyId, role } = msg;
      io?.to(`party:${partyId}`).emit("party:role-changed", {
        playerId, username, role,
      });
      break;
    }

    case "party:chat": {
      const { partyId, text } = msg;
      sendToParty(partyId, { type: "party:chat", playerId, username, text });
      break;
    }
  }
}

function sendToParty(partyId: string, data: any): void {
  const members = partyMembers.get(partyId);
  if (!members) return;
  for (const pid of members) {
    const ws = godotClients.get(pid);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }
  // Also send to Socket.IO clients
  io?.to(`party:${partyId}`).emit("godot:" + data.type, data);
}

export function initSocketIO(server: HttpServer): Server {
  // Initialize Godot WebSocket alongside Socket.IO
  initGodotWebSocket(server);

  io = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || "http://localhost:3000",
      credentials: true,
    },
  });

  // Auth middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) {
      return next(new Error("Authentication required"));
    }

    const payload = verifyToken(token as string);
    if (!payload) {
      return next(new Error("Invalid or expired token"));
    }

    (socket as any).player = payload;
    next();
  });

  io.on("connection", (socket: Socket) => {
    const player = (socket as any).player as JwtPayload;
    const playerId = player.id;

    console.log(`[Socket] ${player.username} (${playerId}) connected`);

    // Track online status
    if (!onlinePlayers.has(playerId)) {
      onlinePlayers.set(playerId, new Set());
    }
    onlinePlayers.get(playerId)!.add(socket.id);
    io?.emit("player:online", { playerId, username: player.username });

    // Join party room (if in one)
    socket.on("party:join-room", (partyId: string) => {
      socket.join(`party:${partyId}`);
      if (!partyMembers.has(partyId)) {
        partyMembers.set(partyId, new Set());
      }
      partyMembers.get(partyId)!.add(playerId);
      io?.to(`party:${partyId}`).emit("party:member-joined", {
        playerId,
        username: player.username,
      });
    });

    socket.on("party:leave-room", (partyId: string) => {
      socket.leave(`party:${partyId}`);
      partyMembers.get(partyId)?.delete(playerId);
      io?.to(`party:${partyId}`).emit("party:member-left", {
        playerId,
        username: player.username,
      });
    });

    // Handle disconnect
    socket.on("disconnect", () => {
      console.log(`[Socket] ${player.username} disconnected`);

      const sockets = onlinePlayers.get(playerId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          onlinePlayers.delete(playerId);
          io?.emit("player:offline", { playerId });

          // Remove from party rooms
          for (const [partyId, members] of partyMembers) {
            if (members.has(playerId)) {
              members.delete(playerId);
              io?.to(`party:${partyId}`).emit("party:member-left", {
                playerId,
                username: player.username,
              });
            }
          }
        }
      }
    });
  });

  console.log("[Socket.IO] Initialized");
  return io;
}

// ─── Broadcast helpers ─────────────────────────────────────────

/**
 * Broadcast party formation update (member joined/left/role changed).
 */
export function broadcastPartyFormation(
  partyId: string,
  data: {
    members: Array<{
      playerId: string;
      username: string;
      role: string;
      position: string;
      stats: { atk: number; def: number; hp: number };
      isOnline: boolean;
    }>;
  },
): void {
  io?.to(`party:${partyId}`).emit("party:formation", data);
}
