'use client'

import { useEffect, useState } from 'react'
import { sdk } from '@/lib/sdk-mock' // Mock SDK for development
import { useQuery } from '@tanstack/react-query'
import { AdminGenerationList } from '@/components/admin/generation-list'
import { Loader2, AlertCircle } from 'lucide-react'
import { env } from '@/env'

export default function AdminPage() {
  const [isReady, setIsReady] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    sdk.actions.ready().then(async () => {
      setIsReady(true)
      
      // Check if user is admin
      try {
        const { token } = await sdk.quickAuth.getToken()
        const response = await fetch('/api/protected/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        
        if (response.ok) {
          const user = await response.json()
          // Check if user's primary address matches admin wallet
          if (user.primaryAddress?.toLowerCase() === env.ADMIN_WALLET_ADDRESS.toLowerCase()) {
            setIsAdmin(true)
          }
        }
      } catch (error) {
        console.error('Admin check error:', error)
      } finally {
        setIsChecking(false)
      }
    })
  }, [])

  if (!isReady || isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass p-8 rounded-2xl text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-foreground/70">
            You don't have permission to access this page.
          </p>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Admin Panel</h1>
          <p className="text-foreground/70">
            Manage generations, select top 900, and regenerate images
          </p>
        </div>

        <AdminGenerationList />
      </div>
    </main>
  )
}

