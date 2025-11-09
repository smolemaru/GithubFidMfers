'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { Sparkles, ArrowRight } from 'lucide-react'

export function Hero() {
  return (
    <section className="relative pt-32 pb-24 px-4 overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-20 left-10 w-20 h-20 border border-primary/20 rounded-full" />
      <div className="absolute bottom-20 right-10 w-32 h-32 border border-purple-500/20 rounded-full" />
      
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-center relative"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-primary/20 mb-8"
          >
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">ArtistxAi fusion powered minting on Base</span>
          </motion.div>
          
          {/* Main title with better gradient */}
          <h1 className="text-7xl md:text-9xl font-black mb-6 tracking-tight">
            <span className="inline-block bg-gradient-to-br from-white via-primary to-purple-400 bg-clip-text text-transparent">
              FIDMfers
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-foreground/70 mb-12 max-w-2xl mx-auto leading-relaxed">
            Turn your Farcaster profile into a{' '}
            <span className="text-primary font-semibold">stunning 3DMFER</span>.
          </p>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <Link 
              href="#generate" 
              className="group relative px-8 py-4 bg-primary hover:bg-primary/90 rounded-full text-lg font-bold transition-all duration-300 shadow-lg shadow-primary/50 hover:shadow-primary/70 hover:scale-105"
            >
              <span className="flex items-center gap-2">
                Generate Now
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>
            <Link 
              href="/gallery" 
              className="px-8 py-4 glass glass-hover rounded-full text-lg font-semibold border border-white/10 hover:border-primary/50 transition-all duration-300"
            >
              View Gallery
            </Link>
          </div>
          
          {/* Stats cards */}
          <div className="flex flex-wrap gap-6 justify-center items-stretch">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="glass px-8 py-6 rounded-2xl border border-white/5 min-w-[160px]"
            >
              <div className="text-4xl font-black bg-gradient-to-br from-primary to-purple-400 bg-clip-text text-transparent mb-2">
                0.80
              </div>
              <div className="text-sm text-foreground/60 font-medium">0.99 usdc</div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="glass px-8 py-6 rounded-2xl border border-white/5 min-w-[160px]"
            >
              <div className="text-4xl font-black bg-gradient-to-br from-pink-400 to-purple-400 bg-clip-text text-transparent mb-2">
                900
              </div>
              <div className="text-sm text-foreground/60 font-medium">900 top creations will become LTC on VibeMarket</div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="glass px-8 py-6 rounded-2xl border border-white/5 min-w-[160px]"
            >
              <div className="text-4xl font-black bg-gradient-to-br from-purple-400 to-indigo-400 bg-clip-text text-transparent mb-2">
                2x
              </div>
              <div className="text-sm text-foreground/60 font-medium">Votes Per User</div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

