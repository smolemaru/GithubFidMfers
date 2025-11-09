'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { NeynarContextProvider, Theme } from '@neynar/react'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  )

  return (
    <NeynarContextProvider
      settings={{
        clientId: process.env.NEXT_PUBLIC_NEYNAR_CLIENT_ID || '',
        defaultChain: 8453, // Base mainnet
        evmProviderUrl: process.env.NEXT_PUBLIC_BASE_RPC_URL,
      }}
    >
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </NeynarContextProvider>
  )
}

