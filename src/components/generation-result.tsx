'use client'

import { useState } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Download, Share2, Loader2 } from 'lucide-react'
import { ShareDialog } from './share-dialog'

interface GenerationResultProps {
  generation: {
    id: string
    imageUrl: string
    status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  }
  referralCode: string
}

export function GenerationResult({ generation, referralCode }: GenerationResultProps) {
  const [showShareDialog, setShowShareDialog] = useState(false)

  function handleDownload() {
    const link = document.createElement('a')
    link.href = generation.imageUrl
    link.download = `vibemfer-${generation.id}.png`
    link.click()
  }

  if (generation.status === 'PROCESSING' || generation.status === 'PENDING') {
    return (
      <div className="glass p-8 rounded-xl text-center">
        <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary mb-4" />
        <p className="text-foreground/80">Creating your VibeMfer...</p>
        <p className="text-sm text-foreground/50 mt-2">This may take up to 60 seconds</p>
      </div>
    )
  }

  if (generation.status === 'FAILED') {
    return (
      <div className="glass p-8 rounded-xl text-center border-2 border-red-500/50">
        <p className="text-red-400 font-semibold mb-2">Generation Failed</p>
        <p className="text-sm text-foreground/70">
          An error occurred. Please try regenerating.
        </p>
      </div>
    )
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="glass p-4 rounded-xl"
      >
        <div className="relative aspect-square rounded-lg overflow-hidden mb-4">
          <Image
            src={generation.imageUrl}
            alt="Generated VibeMfer"
            fill
            className="object-cover"
            priority
          />
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={handleDownload}
            className="flex-1 glass glass-hover py-3 rounded-lg font-semibold flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download
          </button>
          <button
            onClick={() => setShowShareDialog(true)}
            className="flex-1 bg-primary hover:bg-primary/90 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <Share2 className="w-4 h-4" />
            Share & Earn Points
          </button>
        </div>
      </motion.div>

      <ShareDialog
        isOpen={showShareDialog}
        onClose={() => setShowShareDialog(false)}
        generationId={generation.id}
        imageUrl={generation.imageUrl}
        referralCode={referralCode}
      />
    </>
  )
}

