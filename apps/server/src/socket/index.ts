/**
 * Legacy socket module — reduced to shared state maps.
 * Socket.IO and Godot WebSocket have been removed in favor of SSE.
 */

/**
 * Map of online players: playerId → set of connection IDs.
 * Retained for party-service and friend-service isOnline checks.
 */
export const onlinePlayers = new Map<string, Set<string>>();

/**
 * Map of party rooms: partyId → set of player IDs.
 * Retained for party-service leave/disband logic.
 */
export const partyMembers = new Map<string, Set<string>>();
