'use client'

import { useState } from 'react'
import { useAccount, useContractWrite, useWaitForTransaction } from 'wagmi'
import { parseUnits } from 'ethers'
import { Button } from './ui/button'
import { useToast } from './ui/use-toast'

interface MintButtonProps {
  generationId: string
  imageUrl: string
  disabled?: boolean
}

export function MintButton({ generationId, imageUrl, disabled }: MintButtonProps) {
  const { address, isConnected } = useAccount()
  const { toast } = useToast()
  const [isMinting, setIsMinting] = useState(false)
  const [mintData, setMintData] = useState<any>(null)

  const handleMint = async () => {
    if (!isConnected || !address) {
      toast({
        title: 'Connect Wallet',
        description: 'Please connect your wallet to mint',
        variant: 'destructive',
      })
      return
    }

    try {
      setIsMinting(true)

      // Step 1: Prepare mint (upload to IPFS, get signature)
      toast({
        title: 'Preparing mint...',
        description: 'Uploading to IPFS and generating signature',
      })

      const prepareRes = await fetch('/api/protected/prepare-mint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          generationId,
          walletAddress: address,
        }),
      })

      if (!prepareRes.ok) {
        const error = await prepareRes.json()
        throw new Error(error.error || 'Failed to prepare mint')
      }

      const data = await prepareRes.json()
      setMintData(data)

      // Step 2: Approve USDC spending
      toast({
        title: 'Approve USDC',
        description: 'Please approve USDC spending in your wallet',
      })

      // TODO: Implement USDC approval using wagmi
      // This requires the user to approve the NFT contract to spend their USDC

      // Step 3: Call presignedMint on contract
      toast({
        title: 'Minting NFT',
        description: 'Please confirm the transaction in your wallet',
      })

      // TODO: Implement presignedMint call using wagmi
      // This requires calling the contract's presignedMint function

      // Step 4: Confirm mint on backend
      const confirmRes = await fetch('/api/protected/confirm-mint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          generationId,
          txHash: '0x...', // TODO: Get actual tx hash from wagmi
        }),
      })

      if (!confirmRes.ok) {
        const error = await confirmRes.json()
        throw new Error(error.error || 'Failed to confirm mint')
      }

      toast({
        title: '🎉 NFT Minted!',
        description: 'Your FID MFER is now on the blockchain!',
      })

      // Refresh the page or update state
      setTimeout(() => window.location.reload(), 2000)
    } catch (error: any) {
      console.error('Mint error:', error)
      toast({
        title: 'Mint Failed',
        description: error.message || 'Something went wrong',
        variant: 'destructive',
      })
    } finally {
      setIsMinting(false)
    }
  }

  return (
    <Button
      onClick={handleMint}
      disabled={disabled || isMinting || !isConnected}
      className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
    >
      {isMinting ? 'Minting...' : 'Mint NFT for 0.99 USDC'}
    </Button>
  )
}

