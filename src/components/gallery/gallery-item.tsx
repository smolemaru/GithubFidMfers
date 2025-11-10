'use client'

import { useState } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Heart, Crown } from 'lucide-react'
import { sdk } from '@/lib/sdk'
import { toast } from '@/components/ui/toaster'

interface Generation {
  id: string
  imageUrl: string
  voteCount: number
  selectedFor900: boolean
  user: {
    fid: number
    username: string
    pfpUrl: string
  }
}

interface GalleryItemProps {
  generation: Generation
  onVote: () => void
}

export function GalleryItem({ generation, onVote }: GalleryItemProps) {
  const [isVoting, setIsVoting] = useState(false)
  const [hasVoted, setHasVoted] = useState(false)

  async function handleVote() {
    if (isVoting || hasVoted) return

    setIsVoting(true)
    try {
      const { token } = await sdk.quickAuth.getToken()
      const response = await fetch('/api/protected/vote', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          generationId: generation.id,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to vote')
      }

      const data = await response.json()
      setHasVoted(true)
      toast(`Vote recorded! ${data.votesRemaining} vote(s) remaining`, 'success')
      onVote()
    } catch (error) {
      console.error('Vote error:', error)
      toast(error instanceof Error ? error.message : 'Failed to vote', 'error')
    } finally {
      setIsVoting(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.03, y: -4 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="glass rounded-2xl overflow-hidden group relative border border-white/5 shadow-lg hover:shadow-primary/20"
    >
      {generation.selectedFor900 && (
        <div className="absolute top-2 right-2 z-10 glass px-3 py-1 rounded-full flex items-center gap-1 text-yellow-400">
          <Crown className="w-4 h-4" />
          <span className="text-xs font-semibold">Top 900</span>
        </div>
      )}

      <div className="relative aspect-square">
        <Image
          src={generation.imageUrl}
          alt={`FIDMfer by @${generation.user.username}`}
          fill
          className="object-cover"
        />
        
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Image
                src={generation.user.pfpUrl}
                alt={generation.user.username}
                width={24}
                height={24}
                className="rounded-full"
              />
              <span className="text-sm font-semibold">@{generation.user.username}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Heart
            className={`w-5 h-5 ${hasVoted ? 'fill-red-500 text-red-500' : 'text-foreground/60'}`}
          />
          <span className="font-semibold">{generation.voteCount}</span>
        </div>
        
        <button
          onClick={handleVote}
          disabled={isVoting || hasVoted}
          className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
            hasVoted
              ? 'bg-green-500/20 text-green-400 cursor-not-allowed'
              : 'glass glass-hover'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {hasVoted ? 'Voted ✓' : isVoting ? 'Voting...' : 'Vote'}
        </button>
      </div>
    </motion.div>
  )
}

