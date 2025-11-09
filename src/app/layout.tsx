import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { env } from '@/env'
import { Toaster } from '@/components/ui/toaster'
import { Providers } from '@/components/providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'FID MFERS - Mint Your Unique NFT',
  description: 'AI-powered NFT generator for Farcaster users. Mint your unique FID MFER on Base for 0.99 USDC.',
  openGraph: {
    title: 'FID MFERS - Mint Your Unique NFT',
    description: 'AI-powered NFT generator for Farcaster users',
    url: env.NEXT_PUBLIC_APP_URL,
    siteName: 'FID MFERS',
    type: 'website',
    images: ['/og-image.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FID MFERS',
    description: 'Generate and mint your unique FID MFER NFT',
    images: ['/og-image.png'],
  },
  // Mini App embed metadata
  // See: https://miniapps.farcaster.xyz/docs/reference/mini-app-embed
  // Note: Add real images to public/ folder for production
  other: {
    'fc:miniapp': JSON.stringify({
      version: '1',  // Must be "1" not "next" or "1.0"
      imageUrl: 'https://via.placeholder.com/1200x630/0a0a0f/4F46E5?text=FID+MFERS',
      button: {
        title: 'Mint Your FID MFER',
        action: {
          type: 'launch_frame',
          name: 'FID MFERS',
          url: env.NEXT_PUBLIC_APP_URL,
          splashImageUrl: 'https://via.placeholder.com/200x200/0a0a0f/4F46E5?text=FM',
          splashBackgroundColor: '#0a0a0f',
        },
      },
    }),
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://auth.farcaster.xyz" />
      </head>
      <body className={inter.className}>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}

