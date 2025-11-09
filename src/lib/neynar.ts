import { NeynarAPIClient } from "@neynar/nodejs-sdk"

// Initialize Neynar client
// Add NEYNAR_API_KEY to your .env file
const neynarApiKey = process.env.NEYNAR_API_KEY

if (!neynarApiKey) {
  throw new Error("NEYNAR_API_KEY is not set in environment variables")
}

export const neynarClient = new NeynarAPIClient(neynarApiKey)

/**
 * Neynar API Client
 * 
 * Common operations:
 * 
 * @example Get user by FID
 * const user = await neynarClient.fetchBulkUsers([3])
 * 
 * @example Get user by wallet address
 * const user = await neynarClient.fetchBulkUsersByEthereumAddress(["0x..."])
 * 
 * @example Get casts from a channel
 * const casts = await neynarClient.fetchFeedByChannelIds(["fidpunks"])
 * 
 * @example Get user's casts
 * const casts = await neynarClient.fetchCastsForUser(3)
 * 
 * @example Publish a cast (requires signer)
 * const result = await neynarClient.publishCast({
 *   signerUuid: "your-signer-uuid",
 *   text: "Hello Farcaster!"
 * })
 * 
 * Full documentation: https://docs.neynar.com/reference
 */

