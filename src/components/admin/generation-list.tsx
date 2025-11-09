'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Image from 'next/image'
import { sdk } from '@/lib/sdk-mock' // Mock SDK for development
import { Loader2, RefreshCw, Crown, X } from 'lucide-react'
import { toast } from '@/components/ui/toaster'

export function AdminGenerationList() {
  const [page, setPage] = useState(1)
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-generations', page],
    queryFn: async () => {
      const { token } = await sdk.quickAuth.getToken()
      const response = await fetch(`/api/admin/generations?page=${page}&limit=50`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (!response.ok) throw new Error('Failed to fetch generations')
      return response.json()
    },
  })

  async function handleRegenerate(generationId: string, fid: number) {
    setRegeneratingId(generationId)
    try {
      const { token } = await sdk.quickAuth.getToken()
      const response = await fetch('/api/admin/regenerate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ generationId, fid }),
      })

      if (!response.ok) {
        throw new Error('Failed to regenerate')
      }

      toast('Regeneration started', 'success')
      refetch()
    } catch (error) {
      console.error('Regenerate error:', error)
      toast('Failed to regenerate', 'error')
    } finally {
      setRegeneratingId(null)
    }
  }

  async function handleToggleTop900(generationId: string, currentStatus: boolean) {
    try {
      const { token } = await sdk.quickAuth.getToken()
      const response = await fetch('/api/admin/toggle-top900', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ generationId, selected: !currentStatus }),
      })

      if (!response.ok) {
        throw new Error('Failed to update status')
      }

      toast(currentStatus ? 'Removed from Top 900' : 'Added to Top 900', 'success')
      refetch()
    } catch (error) {
      console.error('Toggle error:', error)
      toast('Failed to update status', 'error')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div>
      <div className="glass p-4 rounded-xl mb-6 flex items-center justify-between">
        <div className="text-sm text-foreground/70">
          Total: {data?.pagination.total || 0} generations
        </div>
        <div className="text-sm font-semibold text-primary">
          Top 900 Selected: {data?.top900Count || 0}/900
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data?.generations.map((gen: any) => (
          <div key={gen.id} className="glass p-4 rounded-xl">
            <div className="relative aspect-square mb-3 rounded-lg overflow-hidden">
              <Image
                src={gen.imageUrl}
                alt={`Generation ${gen.id}`}
                fill
                className="object-cover"
              />
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-foreground/70">FID:</span>
                <span className="font-semibold">{gen.fid}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-foreground/70">Votes:</span>
                <span className="font-semibold">{gen.voteCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-foreground/70">Status:</span>
                <span className={`font-semibold ${
                  gen.status === 'COMPLETED' ? 'text-green-400' :
                  gen.status === 'FAILED' ? 'text-red-400' :
                  'text-yellow-400'
                }`}>
                  {gen.status}
                </span>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => handleRegenerate(gen.id, gen.fid)}
                disabled={regeneratingId === gen.id}
                className="flex-1 glass glass-hover py-2 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {regeneratingId === gen.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                Regen
              </button>
              
              <button
                onClick={() => handleToggleTop900(gen.id, gen.selectedFor900)}
                className={`flex-1 py-2 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 ${
                  gen.selectedFor900
                    ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                    : 'glass glass-hover'
                }`}
              >
                {gen.selectedFor900 ? (
                  <>
                    <X className="w-4 h-4" />
                    Remove
                  </>
                ) : (
                  <>
                    <Crown className="w-4 h-4" />
                    Add to 900
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {data && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-8">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="glass glass-hover px-6 py-2 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-foreground/80">
            Page {page} of {data.pagination.totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(data.pagination.totalPages, p + 1))}
            disabled={page === data.pagination.totalPages}
            className="glass glass-hover px-6 py-2 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}

