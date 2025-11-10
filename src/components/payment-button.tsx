'use client'

import { useState } from 'react'
import { parseEther, parseUnits } from 'viem'
import { Loader2, Wallet } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { sdk } from '@/lib/sdk'
import { env } from '@/env'

interface PaymentButtonProps {
  onSuccess: () => void
}

function getMintPrice(score: number, verified: boolean): string {
  if (score >= 1.0 && verified) {
    return '0.35'
  } else if (score >= 0.5 && score < 1.0) {
    return '0.99'
  } else if (score < 0.5) {
    return '3.00'
  } else {
    // Default to 0.99 if score is exactly 1.0 but not verified
    return '0.99'
  }
}

export function PaymentButton({ onSuccess }: PaymentButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  
  // Get eligibility to determine price
  const { data: eligibility } = useQuery({
    queryKey: ['eligibility'],
    queryFn: async () => {
      const { token } = await sdk.quickAuth.getToken()
      
      const profileResponse = await fetch('/api/protected/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      
      if (!profileResponse.ok) {
        throw new Error('Failed to fetch profile')
      }
      
      const profile = await profileResponse.json()
      
      const neynarResponse = await fetch(
        `https://api.neynar.com/v2/farcaster/user/bulk?fids=${profile.fid}`,
        {
          headers: {
            'api_key': env.NEYNAR_API_KEY || '',
          },
        }
      )
      
      if (!neynarResponse.ok) {
        throw new Error('Failed to fetch Neynar data')
      }
      
      if (!neynarResponse.ok) {
        const errorText = await neynarResponse.text()
        console.error('Neynar API error:', neynarResponse.status, errorText)
        throw new Error(`Failed to fetch Neynar data: ${neynarResponse.status}`)
      }
      
      const neynarData = await neynarResponse.json()
      const neynarUser = neynarData.users?.[0]
      
      if (!neynarUser) {
        console.error('Neynar user not found in response:', neynarData)
        throw new Error('User not found in Neynar response')
      }
      
      // Get Neynar score (default to 0 if not available)
      // If score is not available, calculate a rough estimate based on follower count
      let score = neynarUser.neynar_score || neynarUser.score || 0
      
      // If no score available, use a rough estimate based on followers
      if (score === 0 && neynarUser.follower_count) {
        // Rough estimate: 1000 followers = 0.1 score, 5000 = 0.5, 10000 = 1.0
        score = Math.min(neynarUser.follower_count / 10000, 1.0)
      }
      
      const verified = neynarUser.power_badge || false
      
      return {
        score,
        verified,
        mintPrice: getMintPrice(score, verified),
      }
    },
    retry: false,
  })
  
  const mintPrice = eligibility?.mintPrice || '0.99'

  async function handlePayment() {
    setIsProcessing(true)
    
    try {
      // Check if wallet is available
      if (!window.ethereum) {
        throw new Error('Please install a Web3 wallet (e.g., MetaMask, Coinbase Wallet)')
      }

      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      }) as string[]

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found')
      }

      const userAddress = accounts[0]

      // Check if on Base network
      const chainId = await window.ethereum.request({
        method: 'eth_chainId',
      }) as string

      const baseChainId = `0x${parseInt(env.NEXT_PUBLIC_CHAIN_ID || '8453').toString(16)}`
      
      if (chainId !== baseChainId) {
        // Switch to Base network
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: baseChainId }],
          })
        } catch (switchError: any) {
          // Chain not added, add it
          if (switchError.code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: baseChainId,
                chainName: 'Base',
                nativeCurrency: {
                  name: 'Ether',
                  symbol: 'ETH',
                  decimals: 18,
                },
                rpcUrls: ['https://mainnet.base.org'],
                blockExplorerUrls: ['https://basescan.org'],
              }],
            })
          } else {
            throw switchError
          }
        }
      }

      // USDC has 6 decimals
      const amountInUSDC = parseUnits(mintPrice, 6)

      // ERC20 transfer function signature
      const transferData = `0xa9059cbb${
        env.ADMIN_WALLET_ADDRESS?.slice(2).padStart(64, '0') || '0'.repeat(64)
      }${amountInUSDC.toString(16).padStart(64, '0')}`

      // Send USDC transfer transaction
      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
          from: userAddress,
          to: env.NEXT_PUBLIC_USDC_CONTRACT_ADDRESS!,
          data: transferData,
          value: '0x0',
        }],
      }) as string

      // Record payment on backend
      const { token } = await (await import('@/lib/sdk')).sdk.quickAuth.getToken()
      
      const response = await fetch('/api/protected/payment', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          txHash,
          amount: mintPrice,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to record payment')
      }

      onSuccess()
    } catch (error) {
      console.error('Payment error:', error)
      alert(error instanceof Error ? error.message : 'Payment failed')
    } finally {
      setIsProcessing(false)
    }
  }

  // Minting disabled for now
  const mintingDisabled = true

  return (
    <button
      onClick={handlePayment}
      disabled={isProcessing || !eligibility || mintingDisabled}
      className="glass glass-hover px-8 py-4 rounded-full text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 mx-auto"
      title={mintingDisabled ? 'Minting is currently disabled' : undefined}
    >
      {isProcessing ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          Processing...
        </>
      ) : (
        <>
          <Wallet className="w-5 h-5" />
          {mintingDisabled ? 'Minting Disabled' : `Pay ${mintPrice} USDC`}
        </>
      )}
    </button>
  )
}

