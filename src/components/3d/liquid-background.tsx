'use client'

export function LiquidBackground() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      {/* Deep space gradient base */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#1e1b4b_0%,_#0a0a0f_50%,_#000000_100%)]" />
      
      {/* Large organic liquid blobs */}
      <div className="absolute -top-1/2 -left-1/4 w-[1000px] h-[1000px] rounded-full"
           style={{
             background: 'radial-gradient(circle, rgba(99, 102, 241, 0.3) 0%, rgba(99, 102, 241, 0.1) 40%, transparent 70%)',
             filter: 'blur(80px)',
             animation: 'float-slow 25s ease-in-out infinite',
             animationDelay: '0s'
           }} />
      
      <div className="absolute top-1/3 -right-1/4 w-[900px] h-[900px] rounded-full"
           style={{
             background: 'radial-gradient(circle, rgba(139, 92, 246, 0.35) 0%, rgba(139, 92, 246, 0.12) 40%, transparent 70%)',
             filter: 'blur(90px)',
             animation: 'float-slow 30s ease-in-out infinite',
             animationDelay: '5s'
           }} />
      
      <div className="absolute -bottom-1/3 left-1/3 w-[850px] h-[850px] rounded-full"
           style={{
             background: 'radial-gradient(circle, rgba(236, 72, 153, 0.25) 0%, rgba(236, 72, 153, 0.08) 40%, transparent 70%)',
             filter: 'blur(85px)',
             animation: 'float-slow 28s ease-in-out infinite',
             animationDelay: '10s'
           }} />
      
      <div className="absolute bottom-1/4 right-1/3 w-[750px] h-[750px] rounded-full"
           style={{
             background: 'radial-gradient(circle, rgba(59, 130, 246, 0.3) 0%, rgba(59, 130, 246, 0.1) 40%, transparent 70%)',
             filter: 'blur(75px)',
             animation: 'float-slow 27s ease-in-out infinite',
             animationDelay: '15s'
           }} />
      
      {/* Glowing accent particles */}
      <div className="absolute top-1/4 left-1/4 w-32 h-32 rounded-full bg-indigo-500/20 blur-xl animate-pulse-glow"
           style={{ animationDelay: '0s' }} />
      <div className="absolute top-2/3 right-1/4 w-24 h-24 rounded-full bg-purple-500/20 blur-xl animate-pulse-glow"
           style={{ animationDelay: '2s' }} />
      <div className="absolute bottom-1/3 left-1/2 w-28 h-28 rounded-full bg-pink-500/20 blur-xl animate-pulse-glow"
           style={{ animationDelay: '4s' }} />
      
      {/* Subtle grid overlay for depth */}
      <div className="absolute inset-0 opacity-[0.03]"
           style={{
             backgroundImage: `
               linear-gradient(rgba(99, 102, 241, 0.3) 1px, transparent 1px),
               linear-gradient(90deg, rgba(99, 102, 241, 0.3) 1px, transparent 1px)
             `,
             backgroundSize: '100px 100px',
             maskImage: 'radial-gradient(ellipse at center, black 20%, transparent 80%)',
             WebkitMaskImage: 'radial-gradient(ellipse at center, black 20%, transparent 80%)'
           }} />
      
      {/* Vignette effect */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_0%,_rgba(0,0,0,0.4)_100%)]" />
    </div>
  )
}

