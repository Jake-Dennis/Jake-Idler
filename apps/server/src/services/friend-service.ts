import { db } from "../db/connection.js";
import { friends, players } from "../db/schema/index.js";
import { eq, and, or } from "drizzle-orm";
import { onlinePlayers } from "../socket/index.js";

class FriendService {
  /**
   * Send a friend request.
   */
  async addFriend(playerId: string, targetUsername: string): Promise<void> {
    if (targetUsername.length === 0) throw new Error("Username is required");

    // Find the target player
    const targetRows = await db
      .select()
      .from(players)
      .where(eq(players.username, targetUsername))
      .limit(1);

    if (targetRows.length === 0) throw new Error("Player not found");
    const targetPlayer = targetRows[0];

    if (targetPlayer.id === playerId) throw new Error("Cannot add yourself as a friend");

    // Check existing friendship
    const existing = await db
      .select()
      .from(friends)
      .where(
        or(
          and(eq(friends.playerId, playerId), eq(friends.friendId, targetPlayer.id)),
          and(eq(friends.playerId, targetPlayer.id), eq(friends.friendId, playerId)),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      const rel = existing[0];
      if (rel.status === "accepted") throw new Error("Already friends");
      if (rel.status === "blocked") throw new Error("Cannot send request");
      if (rel.status === "pending") throw new Error("Friend request already pending");
    }

    // Create pending friend request
    await db.insert(friends).values({
      id: crypto.randomUUID(),
      playerId,
      friendId: targetPlayer.id,
      status: "pending",
      createdAt: new Date().toISOString(),
    });
  }

  /**
   * Accept a friend request.
   */
  async acceptFriend(playerId: string, requesterId: string): Promise<void> {
    const result = await db
      .update(friends)
      .set({ status: "accepted" })
      .where(
        and(
          eq(friends.playerId, requesterId),
          eq(friends.friendId, playerId),
          eq(friends.status, "pending"),
        ),
      );

    return;
  }

  /**
   * Remove a friend or cancel a request.
   */
  async removeFriend(playerId: string, friendId: string): Promise<void> {
    await db
      .delete(friends)
      .where(
        or(
          and(eq(friends.playerId, playerId), eq(friends.friendId, friendId)),
          and(eq(friends.playerId, friendId), eq(friends.friendId, playerId)),
        ),
      );

    return;
  }

  /**
   * Get all friends for a player with online status.
   */
  async getFriends(playerId: string): Promise<
    Array<{
      id: string;
      username: string;
      status: string;
      isOnline: boolean;
    }>
  > {
    // Friends where player initiated
    const sentRows = await db
      .select({
        id: friends.id,
        friendId: friends.friendId,
        status: friends.status,
        username: players.username,
      })
      .from(friends)
      .innerJoin(players, eq(friends.friendId, players.id))
      .where(eq(friends.playerId, playerId));

    // Friends where friend initiated
    const receivedRows = await db
      .select({
        id: friends.id,
        friendId: friends.playerId,
        status: friends.status,
        username: players.username,
      })
      .from(friends)
      .innerJoin(players, eq(friends.playerId, players.id))
      .where(eq(friends.friendId, playerId));

    const all = [...sentRows, ...receivedRows];

    return all.map((r) => ({
      id: r.id,
      username: r.username,
      status: r.status,
      isOnline: onlinePlayers.has(r.friendId) && (onlinePlayers.get(r.friendId)?.size || 0) > 0,
    }));
  }

  /**
   * Get pending friend requests (sent TO this player).
   */
  async getPendingRequests(playerId: string): Promise<
    Array<{
      id: string;
      fromPlayerId: string;
      username: string;
    }>
  > {
    const rows = await db
      .select({
        id: friends.id,
        fromPlayerId: friends.playerId,
        username: players.username,
      })
      .from(friends)
      .innerJoin(players, eq(friends.playerId, players.id))
      .where(
        and(eq(friends.friendId, playerId), eq(friends.status, "pending")),
      );

    return rows;
  }
}

export const friendService = new FriendService();
