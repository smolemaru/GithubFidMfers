'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { sdk } from '@/lib/sdk'
import { Loader2, Sparkles } from 'lucide-react'
import { PaymentButton } from './payment-button'
import { GenerationResult } from './generation-result'
import { EligibilityChecker } from './eligibility-checker'
import { useQuery } from '@tanstack/react-query'
import { env } from '@/env'
import { Share2 } from 'lucide-react'

interface UserProfile {
  fid: number
  username: string
  pfpUrl: string
  bio: string
  displayName: string
  referralCode: string
}

export function GenerateSection() {
  const [hasPayment, setHasPayment] = useState(false)
  const [generationsLeft, setGenerationsLeft] = useState(0)
  const [currentGeneration, setCurrentGeneration] = useState<any>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const { data: userProfile, isLoading: isLoadingProfile, error: profileError } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      try {
        console.log('Getting token from SDK...')
        const { token } = await sdk.quickAuth.getToken()
        console.log('Token received:', !!token, token ? `${token.substring(0, 20)}...` : 'null')
        
        if (!token) {
          throw new Error('No token received from SDK. Make sure manifest is signed and accessible.')
        }
        
        console.log('Fetching user profile...')
        const response = await fetch('/api/protected/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        
        console.log('Response status:', response.status)
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          console.error('Profile fetch error:', errorData)
          throw new Error(errorData.error || errorData.message || `Failed to fetch profile: ${response.status}`)
        }
        
        const profile = await response.json()
        console.log('Profile fetched successfully:', profile.fid)
        return profile as UserProfile
      } catch (error) {
        console.error('Auth error:', error)
        throw error
      }
    },
    retry: false,
  })

  async function handleGenerate() {
    if (!userProfile || isGenerating) return

    setIsGenerating(true)
    try {
      const { token } = await sdk.quickAuth.getToken()
      const response = await fetch('/api/protected/generate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Generation failed')
      }

      const generation = await response.json()
      setCurrentGeneration(generation)
      setGenerationsLeft(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Generation error:', error)
      alert(error instanceof Error ? error.message : 'Failed to generate image')
    } finally {
      setIsGenerating(false)
    }
  }

  function handlePaymentSuccess() {
    setHasPayment(true)
    setGenerationsLeft(2)
  }

  if (isLoadingProfile) {
    return (
      <section id="generate" className="py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
        </div>
      </section>
    )
  }

  if (!userProfile) {
    return (
      <section id="generate" className="py-16 px-4">
        <div className="max-w-4xl mx-auto text-center glass p-8 rounded-2xl">
          {profileError ? (
            <div>
              <p className="text-red-400 mb-2">Authentication Error</p>
              <p className="text-foreground/80 text-sm">
                {profileError instanceof Error ? profileError.message : 'Failed to authenticate'}
              </p>
              <p className="text-foreground/60 text-xs mt-4">
                Make sure the manifest is signed at: https://farcaster.xyz/~/developers/mini-apps/manifest?domain=fid-mfers.vercel.app
              </p>
            </div>
          ) : (
            <p className="text-foreground/80">Please authenticate to continue</p>
          )}
        </div>
      </section>
    )
  }

  return (
    <section id="generate" className="py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="glass p-8 rounded-3xl border border-white/5 shadow-2xl"
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold mb-2">Generate Your FIDMfer</h2>
              <p className="text-foreground/70">
                Hello, <span className="text-primary font-semibold">@{userProfile.username}</span>
              </p>
            </div>
            {hasPayment && (
              <div className="text-right">
                <div className="text-sm text-foreground/60">Generations Left</div>
                <div className="text-3xl font-bold text-primary">{generationsLeft}</div>
              </div>
            )}
          </div>

          {!hasPayment ? (
            <div className="text-center py-8 space-y-6">
              <EligibilityChecker />
              <div className="mb-6">
                <Sparkles className="w-16 h-16 mx-auto text-primary mb-4" />
                <h3 className="text-2xl font-bold mb-2">Ready to Mint?</h3>
                <p className="text-foreground/70 mb-1">
                  Price varies by Neynar score and verification status
                </p>
                <p className="text-sm text-foreground/50">
                  Second generation in case you want to try again
                </p>
              </div>
              <PaymentButton onSuccess={handlePaymentSuccess} />
              
              {/* Share Buttons */}
              <div className="pt-6 border-t border-white/10">
                <p className="text-sm text-foreground/60 mb-4">Share FIDMfers coming</p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={async () => {
                      const text = 'FIDMfers are coming to Base!\n\nArtistxAi fusion, social experiment and personilised fun in alpha 🤓'
                      const url = env.NEXT_PUBLIC_APP_URL || 'https://fid-mfers.vercel.app'
                      const farcasterUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(text)}&embeds[]=${encodeURIComponent(url)}`
                      
                      // Use SDK's openUrl which opens in-app browser if in Farcaster app
                      try {
                        await sdk.actions.openUrl(farcasterUrl)
                      } catch (error) {
                        console.log('SDK openUrl failed, using window.open:', error)
                        // Fallback to window.open if SDK fails
                        window.open(farcasterUrl, '_blank')
                      }
                    }}
                    className="glass glass-hover px-6 py-3 rounded-full font-semibold flex items-center gap-2 transition-colors"
                  >
                    <Share2 className="w-4 h-4" />
                    Share on Farcaster
                  </button>
                  <button
                    onClick={async () => {
                      const text = 'FIDMfers are coming to Base!\n\nArtistxAi fusion, social experiment and personilised fun in alpha 🤓'
                      const url = env.NEXT_PUBLIC_APP_URL || 'https://fid-mfers.vercel.app'
                      const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`
                      
                      // Check if we're in Farcaster app - use SDK to open X/Twitter in-app
                      try {
                        const context = await sdk.context
                        // If in Farcaster app, use SDK's openUrl which opens in-app browser
                        if (context.location?.type === 'cast_embed' || 
                            context.location?.type === 'channel' || 
                            context.location?.type === 'cast_share') {
                          // Use x:// protocol to open X app if available, otherwise web
                          await sdk.actions.openUrl(twitterUrl)
                          return
                        }
                      } catch (error) {
                        console.log('SDK context check failed:', error)
                      }
                      
                      // Fallback: try to use SDK's openUrl
                      try {
                        await sdk.actions.openUrl(twitterUrl)
                      } catch (error) {
                        // If that fails, use web URL
                        window.open(twitterUrl, '_blank')
                      }
                    }}
                    className="glass glass-hover px-6 py-3 rounded-full font-semibold flex items-center gap-2 transition-colors"
                  >
                    <Share2 className="w-4 h-4" />
                    Share on X
                  </button>
                </div>
              </div>
            </div>
          ) : generationsLeft > 0 ? (
            <div className="space-y-6">
              {currentGeneration && userProfile && (
                <GenerationResult 
                  generation={currentGeneration} 
                  referralCode={userProfile.referralCode}
                />
              )}
              
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full glass glass-hover py-4 rounded-xl font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    {currentGeneration ? 'Regenerate' : 'Generate Now'}
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-foreground/70 mb-4">
                You've used all your generations! Check out your creation in the gallery.
              </p>
              <a
                href="/gallery"
                className="inline-block glass glass-hover px-8 py-3 rounded-xl font-semibold"
              >
                View Gallery
              </a>
            </div>
          )}
        </motion.div>
      </div>
    </section>
  )
}

