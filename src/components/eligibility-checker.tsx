'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2, CheckCircle2, XCircle, AlertCircle, Copy, Check } from 'lucide-react'
import { sdk } from '@/lib/sdk'
import { useToast } from '@/components/ui/use-toast'

interface EligibilityResult {
  score: number
  verified: boolean
  mintPrice: string
  eligible: boolean
  reason?: string
  hasProBadge?: boolean
  hasEnoughTokens?: boolean
  tokenBalance?: string
  requiredBalance?: string
  note?: string
}

const SMOLEMARU_CONTRACT = '0x19d45c0497de6921d2c7f5800d279123ac36a524'

export function EligibilityChecker() {
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)
  
  const { data: eligibility, isLoading, error } = useQuery({
    queryKey: ['eligibility'],
    queryFn: async (): Promise<EligibilityResult> => {
      const { token } = await sdk.quickAuth.getToken()
      
      // Use server-side API route to check eligibility (has access to NEYNAR_API_KEY)
      const eligibilityResponse = await fetch('/api/protected/eligibility', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      
      if (!eligibilityResponse.ok) {
        const errorData = await eligibilityResponse.json().catch(() => ({}))
        const errorMessage = errorData.error || errorData.details || `Failed to check eligibility: ${eligibilityResponse.status}`
        console.error('Eligibility check error:', errorData)
        throw new Error(errorMessage)
      }
      
      const eligibilityData = await eligibilityResponse.json()
      return eligibilityData as EligibilityResult
    },
    retry: false,
  })

  if (isLoading) {
    return (
      <div className="glass p-6 rounded-2xl border border-white/5">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span className="text-foreground/80">Checking eligibility...</span>
        </div>
      </div>
    )
  }

  if (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return (
      <div className="glass p-6 rounded-2xl border border-red-500/20 bg-red-500/5">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <XCircle className="w-5 h-5 text-red-400" />
            <span className="text-red-400 font-semibold">Failed to check eligibility</span>
          </div>
          <p className="text-sm text-red-300/80">{errorMessage}</p>
          <p className="text-xs text-red-300/60">
            Check browser console for details. Make sure NEYNAR_API_KEY is set correctly.
          </p>
        </div>
      </div>
    )
  }

  if (!eligibility) {
    return null
  }

  return (
    <div className="glass p-6 rounded-2xl border border-white/5">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-400" />
            <span className="font-semibold">Eligibility Status</span>
          </div>
          {eligibility.eligible && (
            <div className="text-right">
              <div className="text-2xl font-black text-primary">
                {eligibility.mintPrice} USDC
              </div>
              <div className="text-xs text-foreground/60">Mint Price</div>
            </div>
          )}
          {!eligibility.eligible && (
            <div className="text-right">
              <div className="text-2xl font-black text-red-400">
                0.35-0.99 USDC
              </div>
              <div className="text-xs text-foreground/60">Mint Price</div>
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/10">
          <div>
            <div className="text-sm text-foreground/60 mb-1">Neynar Score</div>
            <div className="text-lg font-bold">
              <span className="text-primary">{eligibility.score.toFixed(2)}</span>
            </div>
          </div>
          <div>
            <div className="text-sm text-foreground/60 mb-1">Pro Badge</div>
            <div className="text-lg font-bold">
              {eligibility.hasProBadge ? (
                <span className="text-green-400">✓ Yes</span>
              ) : (
                <span className="text-red-400">✗ No</span>
              )}
            </div>
          </div>
          <div>
            <div className="text-sm text-foreground/60 mb-1">
              $smolemaru{' '}
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(SMOLEMARU_CONTRACT)
                    setCopied(true)
                    toast({
                      title: 'Copied!',
                      description: 'Contract address copied to clipboard',
                    })
                    setTimeout(() => setCopied(false), 2000)
                  } catch (error) {
                    toast({
                      title: 'Error',
                      description: 'Failed to copy address',
                    })
                  }
                }}
                className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                title="Click to copy contract address"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3" />
                    <span className="font-mono">{SMOLEMARU_CONTRACT.slice(0, 6)}...{SMOLEMARU_CONTRACT.slice(-4)}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span className="font-mono">{SMOLEMARU_CONTRACT.slice(0, 6)}...{SMOLEMARU_CONTRACT.slice(-4)}</span>
                  </>
                )}
              </button>
            </div>
            <div className="text-lg font-bold">
              {eligibility.hasEnoughTokens ? (
                <span className="text-green-400">✓ {eligibility.tokenBalance || '0'}</span>
              ) : (
                <span className="text-red-400">✗ {eligibility.tokenBalance || '0'}</span>
              )}
            </div>
            <div className="text-xs text-foreground/50 mt-1">
              HOLD 200.000 $smolemaru
            </div>
            {eligibility.requiredBalance && (
              <div className="text-xs text-foreground/50">
                Required: {eligibility.requiredBalance}
              </div>
            )}
          </div>
        </div>
        
        {!eligibility.eligible && eligibility.reason && (
          <div className="pt-4 border-t border-white/10">
            <div className="text-sm text-red-400 font-semibold mb-1">Not Eligible</div>
            <div className="text-xs text-red-300/80 mb-2">{eligibility.reason}</div>
            {eligibility.note && (
              <div className="text-xs text-foreground/60 mt-2 p-2 bg-white/5 rounded">
                💡 {eligibility.note}
              </div>
            )}
          </div>
        )}
        
        {eligibility.eligible && (
          <div className="pt-4 border-t border-white/10">
            <div className="text-sm text-green-400 font-semibold">
              ✓ Eligible - Pro badge and 200,000+ $smolemaru required
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

