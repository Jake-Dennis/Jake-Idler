import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";
const TOKEN_EXPIRY = "7d";

export interface JwtPayload {
  id: string;
  username: string;
}

export function generateToken(player: { id: string; username: string }): string {
  return jwt.sign({ id: player.id, username: player.username }, JWT_SECRET, {
    expiresIn: TOKEN_EXPIRY,
  });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    return { id: decoded.id, username: decoded.username };
  } catch {
    return null;
  }
}
