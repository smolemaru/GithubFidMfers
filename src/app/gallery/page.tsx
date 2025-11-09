'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { sdk } from '@/lib/sdk-mock' // Mock SDK for development
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import Link from 'next/link'

// Import 3D gallery client-side only (no SSR)
const Gallery3D = dynamic(
  () => import('@/components/gallery/gallery-3d').then((mod) => mod.Gallery3D),
  { 
    ssr: false, 
    loading: () => (
      <div className="h-screen flex items-center justify-center bg-black">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    ) 
  }
)

export default function GalleryPage() {
  const [isReady, setIsReady] = useState(false)
  const [page, setPage] = useState(1)
  const queryClient = useQueryClient()

  useEffect(() => {
    sdk.actions.ready().then(() => {
      setIsReady(true)
    })
  }, [])

  const { data: galleryData, isLoading } = useQuery({
    queryKey: ['gallery', page],
    queryFn: async () => {
      const response = await fetch(`/api/gallery?page=${page}&limit=50`)
      if (!response.ok) throw new Error('Failed to fetch gallery')
      return response.json()
    },
  })

  const handleVote = async (generationId: string) => {
    try {
      const { token } = await sdk.quickAuth.getToken()
      const response = await fetch('/api/protected/vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ generationId }),
      })

      if (response.ok) {
        // Refresh gallery data
        queryClient.invalidateQueries({ queryKey: ['gallery', page] })
      }
    } catch (error) {
      console.error('Error voting:', error)
    }
  }

  if (!isReady) {
    return null
  }

  const images = galleryData?.generations?.map((gen: any) => ({
    url: gen.imageUrl,
    id: gen.id,
    voteCount: gen.voteCount,
    onVote: () => handleVote(gen.id),
  })) || []

  return (
    <main className="h-screen relative overflow-hidden bg-black">
      {/* Header overlay */}
      <div className="absolute top-0 left-0 right-0 z-20 p-6 bg-gradient-to-b from-black/90 to-transparent pointer-events-none">
        <div className="max-w-7xl mx-auto flex items-center justify-between pointer-events-auto">
          <div>
            <h1 className="text-3xl font-black mb-1 bg-gradient-to-br from-white via-primary to-purple-400 bg-clip-text text-transparent">
              FIDMfers Gallery
            </h1>
            <p className="text-foreground/70 text-sm">
              Scroll to explore • Click to vote • 2 votes per user
            </p>
          </div>
          <Link
            href="/"
            className="px-6 py-3 bg-primary hover:bg-primary/90 rounded-full font-bold transition-all duration-300 shadow-lg shadow-primary/30 hover:scale-105"
          >
            Generate Yours
          </Link>
        </div>
      </div>

      {/* 3D Interactive Gallery */}
      {isLoading ? (
        <div className="h-full flex items-center justify-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
        </div>
      ) : images.length > 0 ? (
        <Gallery3D images={images} />
      ) : (
        <div className="h-full flex items-center justify-center">
          <p className="text-foreground/50 text-lg">No generations yet</p>
        </div>
      )}

      {/* Page navigation overlay */}
      {galleryData && galleryData.pagination.totalPages > 1 && (
        <div className="absolute bottom-6 left-0 right-0 z-20 pointer-events-none">
          <div className="max-w-7xl mx-auto flex items-center justify-center gap-4 pointer-events-auto">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="glass glass-hover px-6 py-2 rounded-full font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="glass px-4 py-2 rounded-full text-sm">
              Page {page} of {galleryData.pagination.totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(galleryData.pagination.totalPages, p + 1))}
              disabled={page === galleryData.pagination.totalPages}
              className="glass glass-hover px-6 py-2 rounded-full font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </main>
  )
}

