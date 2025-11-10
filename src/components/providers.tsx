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
                staleTime: 5 * 60 * 1000, // 5 minutes - data is fresh for 5 minutes
                gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache for 10 minutes
                refetchOnWindowFocus: false, // Don't refetch when window regains focus
                refetchOnMount: false, // Don't refetch on mount if data exists
                refetchOnReconnect: false, // Don't refetch on reconnect
                retry: 1, // Retry once on failure
              },
            },
          })
  )

  return (
    <NeynarContextProvider
      settings={{
        clientId: process.env.NEXT_PUBLIC_NEYNAR_CLIENT_ID || '',
      }}
    >
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </NeynarContextProvider>
  )
}

