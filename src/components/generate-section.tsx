'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { sdk } from '@/lib/sdk'
import { Loader2, Sparkles } from 'lucide-react'
import { PaymentButton } from './payment-button'
import { GenerationResult } from './generation-result'
import { useQuery } from '@tanstack/react-query'
import { env } from '@/env'

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

  const { data: userProfile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const { token } = await sdk.quickAuth.getToken()
      const response = await fetch('/api/protected/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (!response.ok) throw new Error('Failed to fetch profile')
      return response.json() as Promise<UserProfile>
    },
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
          <p className="text-foreground/80">Please authenticate to continue</p>
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
            <div className="text-center py-8">
              <div className="mb-6">
                <Sparkles className="w-16 h-16 mx-auto text-primary mb-4" />
                <h3 className="text-2xl font-bold mb-2">Ready to Create?</h3>
                <p className="text-foreground/70 mb-1">
                  {env.NEXT_PUBLIC_GENERATION_PRICE} USDC for 2 generations
                </p>
                <p className="text-sm text-foreground/50">
                  Second generation in case you want to try again
                </p>
              </div>
              <PaymentButton onSuccess={handlePaymentSuccess} />
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

