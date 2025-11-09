'use client'

import { GalleryItem } from './gallery-item'

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

interface GalleryGridProps {
  generations: Generation[]
  onVote: () => void
}

export function GalleryGrid({ generations, onVote }: GalleryGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {generations.map((generation) => (
        <GalleryItem
          key={generation.id}
          generation={generation}
          onVote={onVote}
        />
      ))}
    </div>
  )
}

