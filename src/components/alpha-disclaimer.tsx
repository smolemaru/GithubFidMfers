'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

export function AlphaDisclaimer() {
  const [isVisible, setIsVisible] = useState(true)

  if (!isVisible) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 p-4">
      <div className="max-w-4xl mx-auto glass border-2 border-yellow-500/50 rounded-lg p-4 backdrop-blur-xl">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <h3 className="text-yellow-400 font-bold text-lg mb-2">
              ⚠️ Alpha Version Disclaimer
            </h3>
            <p className="text-sm text-foreground/90">
              This is an alpha version of VibeMfers. While we strive for accuracy, 
              <span className="font-semibold text-yellow-300"> you may lose funds due to AI errors or technical issues</span>.
              By using this app, you acknowledge and accept these risks. 
              Thank you for participating in the alpha! 
              <span className="font-semibold text-primary"> The best AI for creators is coming soon to Base</span>.
            </p>
          </div>
          <button
            onClick={() => setIsVisible(false)}
            className="text-foreground/60 hover:text-foreground transition-colors"
            aria-label="Close disclaimer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}

