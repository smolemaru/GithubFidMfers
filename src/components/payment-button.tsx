'use client'

import { useState } from 'react'
import { parseEther, parseUnits } from 'viem'
import { Loader2, Wallet } from 'lucide-react'
import { env } from '@/env'

interface PaymentButtonProps {
  onSuccess: () => void
}

export function PaymentButton({ onSuccess }: PaymentButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false)

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
      const amountInUSDC = parseUnits(env.NEXT_PUBLIC_GENERATION_PRICE || '0.99', 6)

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
      const { token } = await (await import('@/lib/sdk-mock')).sdk.quickAuth.getToken()
      
      const response = await fetch('/api/protected/payment', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          txHash,
          amount: env.NEXT_PUBLIC_GENERATION_PRICE || '0.99',
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

  return (
    <button
      onClick={handlePayment}
      disabled={isProcessing}
      className="glass glass-hover px-8 py-4 rounded-full text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 mx-auto"
    >
      {isProcessing ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          Processing...
        </>
      ) : (
        <>
          <Wallet className="w-5 h-5" />
          Pay {env.NEXT_PUBLIC_GENERATION_PRICE} USDC
        </>
      )}
    </button>
  )
}

