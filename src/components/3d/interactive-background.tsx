'use client'

import { useEffect, useRef } from 'react'

export function InteractiveBackground() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 20
      const y = (e.clientY / window.innerHeight - 0.5) * 20
      
      container.style.setProperty('--mouse-x', `${x}px`)
      container.style.setProperty('--mouse-y', `${y}px`)
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  return (
    <div ref={containerRef} className="fixed inset-0 overflow-hidden pointer-events-none" style={{ '--mouse-x': '0px', '--mouse-y': '0px' } as any}>
      {/* Deep gradient base */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#1e1b4b_0%,_#0f0a1f_40%,_#000000_100%)]" />
      
      {/* Animated gradient orbs with parallax */}
      <div 
        className="absolute w-[1200px] h-[1200px] rounded-full opacity-30"
        style={{
          top: '-20%',
          left: '-15%',
          background: 'radial-gradient(circle at center, rgba(99, 102, 241, 0.6) 0%, rgba(99, 102, 241, 0.3) 30%, transparent 70%)',
          filter: 'blur(100px)',
          animation: 'float-complex 30s ease-in-out infinite',
          transform: 'translate(var(--mouse-x), var(--mouse-y))',
        }}
      />
      
      <div 
        className="absolute w-[1000px] h-[1000px] rounded-full opacity-40"
        style={{
          top: '30%',
          right: '-20%',
          background: 'radial-gradient(circle at center, rgba(168, 85, 247, 0.5) 0%, rgba(139, 92, 246, 0.25) 35%, transparent 70%)',
          filter: 'blur(90px)',
          animation: 'float-complex 35s ease-in-out infinite',
          animationDelay: '5s',
          transform: 'translate(calc(var(--mouse-x) * -0.5), calc(var(--mouse-y) * -0.5))',
        }}
      />
      
      <div 
        className="absolute w-[900px] h-[900px] rounded-full opacity-35"
        style={{
          bottom: '-15%',
          left: '35%',
          background: 'radial-gradient(circle at center, rgba(236, 72, 153, 0.4) 0%, rgba(219, 39, 119, 0.2) 40%, transparent 70%)',
          filter: 'blur(95px)',
          animation: 'float-complex 32s ease-in-out infinite',
          animationDelay: '10s',
          transform: 'translate(calc(var(--mouse-x) * 0.7), calc(var(--mouse-y) * 0.7))',
        }}
      />
      
      <div 
        className="absolute w-[850px] h-[850px] rounded-full opacity-30"
        style={{
          top: '60%',
          left: '-10%',
          background: 'radial-gradient(circle at center, rgba(59, 130, 246, 0.45) 0%, rgba(37, 99, 235, 0.2) 35%, transparent 70%)',
          filter: 'blur(85px)',
          animation: 'float-complex 28s ease-in-out infinite',
          animationDelay: '15s',
          transform: 'translate(calc(var(--mouse-x) * 0.3), calc(var(--mouse-y) * 0.3))',
        }}
      />

      {/* Glowing particles */}
      {[...Array(30)].map((_, i) => (
        <div
          key={i}
          className="absolute w-2 h-2 rounded-full"
          style={{
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            background: ['#6366f1', '#8b5cf6', '#ec4899', '#3b82f6'][Math.floor(Math.random() * 4)],
            boxShadow: `0 0 ${10 + Math.random() * 20}px currentColor`,
            animation: `float-particle ${10 + Math.random() * 20}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 5}s`,
            opacity: 0.3 + Math.random() * 0.4,
          }}
        />
      ))}

      {/* Mesh grid overlay */}
      <div 
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(99, 102, 241, 0.4) 1px, transparent 1px),
            linear-gradient(90deg, rgba(99, 102, 241, 0.4) 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px',
          maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 80%)',
        }}
      />

      {/* Radial light effects */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(circle at 30% 30%, rgba(99, 102, 241, 0.08) 0%, transparent 50%)',
          animation: 'pulse-slow 6s ease-in-out infinite',
        }}
      />
      
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(circle at 70% 70%, rgba(168, 85, 247, 0.08) 0%, transparent 50%)',
          animation: 'pulse-slow 8s ease-in-out infinite',
          animationDelay: '3s',
        }}
      />

      {/* Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_30%,_rgba(0,0,0,0.6)_100%)]" />
    </div>
  )
}

