'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { Button } from './ui/button'
import { useToast } from './ui/use-toast'
import { Copy, Check } from 'lucide-react'

interface ShareDialogProps {
  isOpen: boolean
  onClose: () => void
  generationId: string
  imageUrl: string
  tokenId?: number
  referralCode: string // User's referral code
}

export function ShareDialog({
  isOpen,
  onClose,
  generationId,
  imageUrl,
  tokenId,
  referralCode,
}: ShareDialogProps) {
  const { toast } = useToast()
  const [sharing, setSharing] = useState(false)
  const [copied, setCopied] = useState(false)

  // Generate referral link
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
  const referralLink = `${appUrl}?ref=${referralCode}`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink)
      setCopied(true)
      toast({
        title: 'Copied!',
        description: 'Referral link copied to clipboard',
      })
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to copy link',
      })
    }
  }

  const handleShareFarcaster = async () => {
    setSharing(true)
    try {
      const res = await fetch('/api/protected/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          generationId,
          platform: 'farcaster',
        }),
      })

      if (!res.ok) throw new Error('Failed to record share')

      // Create Farcaster cast with referral link
      const castText = tokenId
        ? `I just minted FID MFER #${tokenId} by @smolemaru! ✨\n\nCheck it out and mint yours:`
        : `Check out my FID MFER generation! ✨\n\nMint yours:`

      const farcasterUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(
        castText
      )}&embeds[]=${encodeURIComponent(referralLink)}`

      window.open(farcasterUrl, '_blank')

      toast({
        title: 'Shared on Farcaster!',
        description: 'Your referral link has been included',
      })

      onClose()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to share',
        variant: 'destructive',
      })
    } finally {
      setSharing(false)
    }
  }

  const handleShareX = async () => {
    setSharing(true)
    try {
      const res = await fetch('/api/protected/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          generationId,
          platform: 'x',
        }),
      })

      if (!res.ok) throw new Error('Failed to record share')

      // Create X/Twitter post with referral link
      const tweetText = tokenId
        ? `I just minted FID MFER #${tokenId} by @smolemaru! ✨\n\nCheck it out and mint yours:`
        : `Check out my FID MFER generation! ✨\n\nMint yours:`

      const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
        tweetText
      )}&url=${encodeURIComponent(referralLink)}`

      window.open(twitterUrl, '_blank')

      toast({
        title: 'Shared on X!',
        description: 'Your referral link has been included',
      })

      onClose()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to share',
        variant: 'destructive',
      })
    } finally {
      setSharing(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {tokenId ? `🎉 Your FID MFER #${tokenId} is minted!` : 'Share Your FID MFER'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* NFT Image */}
          <div className="relative aspect-square overflow-hidden rounded-lg border-2 border-indigo-500/20">
            <img
              src={imageUrl}
              alt={tokenId ? `FID MFER #${tokenId}` : 'Your FID MFER'}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Referral Link */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-400">
              Your Referral Link
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={referralLink}
                readOnly
                className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <Button
                onClick={handleCopy}
                size="sm"
                variant="outline"
                className="shrink-0"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              Share this link to earn rewards when friends mint!
            </p>
          </div>

          {/* Share Buttons */}
          <div className="grid gap-2">
            <Button
              onClick={handleShareFarcaster}
              disabled={sharing}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
            >
              Share on Farcaster
            </Button>
            <Button
              onClick={handleShareX}
              disabled={sharing}
              variant="outline"
              className="w-full"
            >
              Share on X
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
