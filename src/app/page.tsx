'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { sdk } from '@/lib/sdk-mock' // Mock SDK for development
import { Hero } from '@/components/hero'
import { GenerateSection } from '@/components/generate-section'
import { AlphaDisclaimer } from '@/components/alpha-disclaimer'

// Import 3D component
const InteractiveBackground = dynamic(
  () => import('@/components/3d/interactive-background').then((mod) => mod.InteractiveBackground),
  { ssr: false }
)

export default function Home() {
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    // Initialize Mini App SDK
    sdk.actions.ready().then(() => {
      setIsReady(true)
    })
  }, [])

  if (!isReady) {
    return null
  }

  return (
    <main className="min-h-screen relative overflow-hidden">
      {/* Interactive particle background */}
      <div className="fixed inset-0 z-0">
        <InteractiveBackground />
      </div>

      <div className="relative z-10">
        <AlphaDisclaimer />
        <Hero />
        <GenerateSection />
      </div>
    </main>
  )
}

