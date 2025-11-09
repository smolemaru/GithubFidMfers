/**
 * Mock SDK for development without Farcaster Mini App SDK
 * 
 * This allows UI preview without the full SDK installed.
 * Replace with real @farcaster/miniapp-sdk in production.
 */

export const sdk = {
  actions: {
    ready: async () => {
      console.log('[Mock SDK] App ready')
      return true
    },
    openUrl: async (url: string) => {
      console.log('[Mock SDK] Opening URL:', url)
      window.open(url, '_blank')
    },
  },
  quickAuth: {
    getToken: async () => {
      console.log('[Mock SDK] Getting token (mock)')
      return { 
        token: 'mock_token_for_development'
      }
    },
    fetch: async (url: string, options?: RequestInit) => {
      console.log('[Mock SDK] Authenticated fetch (mock):', url)
      return fetch(url, options)
    },
    token: null as string | null,
  },
  context: Promise.resolve({
    user: {
      fid: 12345,
      username: 'demo_user',
      displayName: 'Demo User',
      pfpUrl: 'https://via.placeholder.com/150',
    },
    location: {
      type: 'cast_embed' as const,
    },
    client: {
      name: 'Warpcast',
      version: '1.0.0',
    },
  }),
}

export type SDK = typeof sdk

