'use client'

import { useRef, useState, useMemo, useEffect } from 'react'
import { Canvas, useFrame, useThree, useLoader } from '@react-three/fiber'
import * as THREE from 'three'

interface CardProps {
  url: string
  position: [number, number, number]
  scale: [number, number]
  onVote: () => void
  voteCount: number
}

function Card({ url, position, scale, onVote, voteCount }: CardProps) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const [hovered, setHovered] = useState(false)
  const [texture, setTexture] = useState<THREE.Texture | null>(null)

  useEffect(() => {
    const loader = new THREE.TextureLoader()
    loader.load(url, setTexture)
  }, [url])

  useFrame((state) => {
    if (meshRef.current && texture) {
      meshRef.current.scale.x = THREE.MathUtils.lerp(meshRef.current.scale.x, hovered ? scale[0] * 1.15 : scale[0], 0.1)
      meshRef.current.scale.y = THREE.MathUtils.lerp(meshRef.current.scale.y, hovered ? scale[1] * 1.15 : scale[1], 0.1)
    }
  })

  if (!texture) return null

  return (
    <mesh
      ref={meshRef}
      position={position}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      onClick={onVote}
    >
      <planeGeometry args={[scale[0], scale[1]]} />
      <meshBasicMaterial map={texture} side={THREE.DoubleSide} />
    </mesh>
  )
}

function Cards({ images }: { images: Array<{ url: string; id: string; voteCount: number; onVote: () => void }> }) {
  const groupRef = useRef<THREE.Group>(null)
  const scrollY = useRef(0)
  const { viewport } = useThree()

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      scrollY.current += e.deltaY * 0.0005
    }
    window.addEventListener('wheel', handleWheel)
    return () => window.removeEventListener('wheel', handleWheel)
  }, [])

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y = scrollY.current * (Math.PI * 2)
    }
  })

  return (
    <group ref={groupRef}>
      {images.map((image, index) => {
        const angle = (index / images.length) * Math.PI * 2
        const radius = 4
        return (
          <Card
            key={image.id}
            url={image.url}
            position={[Math.sin(angle) * radius, 0, Math.cos(angle) * radius]}
            scale={[1.5, 2]}
            onVote={image.onVote}
            voteCount={image.voteCount}
          />
        )
      })}
    </group>
  )
}

interface Gallery3DProps {
  images: Array<{ url: string; id: string; voteCount: number; onVote: () => void }>
}

export function Gallery3D({ images }: Gallery3DProps) {
  return (
    <Canvas camera={{ position: [0, 0, 10], fov: 70 }}>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />
      <Cards images={images} />
    </Canvas>
  )
}

