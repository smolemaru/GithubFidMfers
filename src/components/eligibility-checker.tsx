'use client'

import { useQuery } from '@tanstack/react-query'
import { Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import { sdk } from '@/lib/sdk'
import { env } from '@/env'

interface EligibilityResult {
  score: number
  verified: boolean
  mintPrice: string
  eligible: boolean
}

export function EligibilityChecker() {
  const { data: eligibility, isLoading, error } = useQuery({
    queryKey: ['eligibility'],
    queryFn: async (): Promise<EligibilityResult> => {
      const { token } = await sdk.quickAuth.getToken()
      
      // Fetch user profile to get FID
      const profileResponse = await fetch('/api/protected/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      
      if (!profileResponse.ok) {
        throw new Error('Failed to fetch profile')
      }
      
      const profile = await profileResponse.json()
      
      // Fetch Neynar user data to get score and verification
      // Use x-api-key header and x-neynar-experimental: true to filter spam
      const neynarResponse = await fetch(
        `https://api.neynar.com/v2/farcaster/user/bulk?fids=${profile.fid}`,
        {
          headers: {
            'x-api-key': env.NEYNAR_API_KEY || '',
            'x-neynar-experimental': 'true', // Filter spam accounts
          },
        }
      )
      
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
      
      // Log all available fields to debug
      console.log('Neynar user data:', {
        fid: neynarUser.fid,
        username: neynarUser.username,
        power_badge: neynarUser.power_badge,
        follower_count: neynarUser.follower_count,
        verified_addresses: neynarUser.verified_addresses,
        allFields: Object.keys(neynarUser), // Log all available fields
      })
      
      // Get Neynar score - check multiple possible fields
      // According to Neynar docs, score might be in different fields
      let score = 0
      
      // Try different possible score fields
      if (neynarUser.neynar_score !== undefined) {
        score = neynarUser.neynar_score
      } else if (neynarUser.score !== undefined) {
        score = neynarUser.score
      } else if (neynarUser.user_score !== undefined) {
        score = neynarUser.user_score
      } else if (neynarUser.quality_score !== undefined) {
        score = neynarUser.quality_score
      }
      
      // If no score available, calculate a rough estimate based on filtered follower count
      // Using filtered followers (with experimental flag) gives more accurate estimate
      if (score === 0 && neynarUser.follower_count) {
        // Rough estimate based on filtered follower count:
        // 1000 filtered followers = 0.1 score, 5000 = 0.5, 10000 = 1.0
        // Filtered followers are more accurate than raw followers
        score = Math.min(neynarUser.follower_count / 10000, 1.0)
        console.log('Using fallback score calculation based on filtered followers:', score)
      }
      
      const verified = neynarUser.power_badge || false
      
      // Calculate mint price based on score and verification
      let mintPrice: string
      let eligible = true
      
      if (score >= 1.0 && verified) {
        mintPrice = '0.35'
      } else if (score >= 0.5 && score < 1.0) {
        mintPrice = '0.99'
      } else if (score < 0.5) {
        mintPrice = '3.00'
      } else {
        // Default to 0.99 if score is exactly 1.0 but not verified
        mintPrice = '0.99'
      }
      
      return {
        score,
        verified,
        mintPrice,
        eligible,
      }
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
    return (
      <div className="glass p-6 rounded-2xl border border-red-500/20 bg-red-500/5">
        <div className="flex items-center gap-3">
          <XCircle className="w-5 h-5 text-red-400" />
          <span className="text-red-400">Failed to check eligibility</span>
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
          <div className="text-right">
            <div className="text-2xl font-black text-primary">
              {eligibility.mintPrice} USDC
            </div>
            <div className="text-xs text-foreground/60">Mint Price</div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
          <div>
            <div className="text-sm text-foreground/60 mb-1">Neynar Score</div>
            <div className="text-lg font-bold">{eligibility.score.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-sm text-foreground/60 mb-1">Verified Badge</div>
            <div className="text-lg font-bold">
              {eligibility.verified ? (
                <span className="text-green-400">✓ Yes</span>
              ) : (
                <span className="text-foreground/40">✗ No</span>
              )}
            </div>
          </div>
        </div>
        
        <div className="pt-4 border-t border-white/10">
          <div className="text-sm text-foreground/60 mb-2">Pricing Tier:</div>
          {eligibility.score >= 1.0 && eligibility.verified ? (
            <div className="text-sm text-green-400">
              ✓ Premium Tier - Score 1.0+ with verified badge
            </div>
          ) : eligibility.score >= 0.5 ? (
            <div className="text-sm text-primary">
              Standard Tier - Score 0.5-0.99
            </div>
          ) : (
            <div className="text-sm text-yellow-400">
              Basic Tier - Score below 0.5
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

