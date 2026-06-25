import type { Response } from "express";
import { gameEvents } from "./event-bus.js";
import { combatSerializer } from "./serializers/combat-serializer.js";
import { sessionManager } from "./session-manager.js";
import { partyService } from "../services/party-service.js";
import { heroService } from "../services/hero-service.js";
import { onlinePlayers } from "../socket/index.js";
import { createChildLogger } from "../observability/logger.js";

const log = createChildLogger("sse-manager");

interface SseClient {
  res: Response;
  playerId: string;
}

export class SseManager {
  private clients = new Map<string, Set<SseClient>>(); // heroId → connections

  constructor() {
    // Combat tick updates
    gameEvents.on("round:processed", (payload) => {
      const run = sessionManager.getRun(payload.runId);
      if (!run) return;

      const data = combatSerializer.toView(run, null);
      const eventName = "party:combat-update";

      if (run.partyId.startsWith("solo_")) {
        // Solo run: send only to the initiator hero
        this.sendToHero(run.initiatorHeroId, eventName, data);
      } else {
        // Party run: send to every hero in the run
        for (const h of run.heroes) {
          this.sendToHero(h.heroId, eventName, data);
        }
      }
    });
  }

  addClient(heroId: string, playerId: string, res: Response): void {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();
    // Disable Nagle's algorithm so small SSE writes are sent immediately
    if ((res as any).socket?.setNoDelay) {
      (res as any).socket.setNoDelay(true);
    }

    // Send initial connected event
    res.write(`event: connected\ndata: ${JSON.stringify({ heroId })}\n\n`);

    const clientSet = this.clients.get(heroId);
    const client: SseClient = { res, playerId };
    if (clientSet) {
      clientSet.add(client);
    } else {
      this.clients.set(heroId, new Set([client]));
    }

    // Track online status (used by party-service and friend-service)
    if (!onlinePlayers.has(playerId)) {
      onlinePlayers.set(playerId, new Set());
    }
    onlinePlayers.get(playerId)!.add(heroId);

    res.on("close", () => {
      this.removeClient(heroId, client);
    });

    log.info({ heroId, playerId }, "SSE client connected");
  }

  private removeClient(heroId: string, client: SseClient): void {
    const set = this.clients.get(heroId);
    if (set) {
      set.delete(client);
      if (set.size === 0) {
        this.clients.delete(heroId);
      }
    }

    // Clean up online status
    const playerSet = onlinePlayers.get(client.playerId);
    if (playerSet) {
      playerSet.delete(heroId);
      if (playerSet.size === 0) {
        onlinePlayers.delete(client.playerId);
      }
    }

    log.info({ heroId }, "SSE client disconnected");
  }

  sendToHero(heroId: string, event: string, data: unknown): void {
    const set = this.clients.get(heroId);
    if (!set || set.size === 0) return;

    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of set) {
      try {
        client.res.write(payload);
      } catch (err) {
        log.error({ heroId, event, err }, "SSE write failed");
      }
    }
  }

  async sendToParty(partyId: string, event: string, data: unknown): Promise<void> {
    const party = partyService.getParty(partyId);
    if (!party) return;

    for (const memberId of party.memberIds) {
      let heroId: string | undefined;
      if (partyService.isBot(memberId)) {
        heroId = memberId; // botId doubles as heroId
      } else {
        try {
          const heroes = await heroService.getHeroesByPlayer(memberId);
          if (heroes.length > 0) heroId = heroes[0].id;
        } catch (err) {
          log.error({ memberId, err }, "Failed to resolve hero for party SSE");
        }
      }
      if (heroId) {
        this.sendToHero(heroId, event, data);
      }
    }
  }
}

export const sseManager = new SseManager();
