import { env } from '@/env'
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'

/**
 * Verify Quick Auth JWT token from Farcaster
 * 
 * In production, you should verify the JWT signature using Farcaster's public keys.
 * For now, this does basic payload extraction and validation.
 * 
 * See: https://miniapps.farcaster.xyz/docs/sdk/quick-auth#validate-a-session-token
 */
export async function verifyQuickAuthToken(token: string) {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) {
      return { fid: null, error: 'Invalid token format' }
    }
    
    // Decode JWT payload
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString())
    
    // Validate required fields
    if (!payload.sub || !payload.iss || !payload.aud) {
      return { fid: null, error: 'Invalid token payload' }
    }
    
    // Check issuer (allow mock tokens for development)
    if (payload.iss !== 'https://auth.farcaster.xyz' && token !== 'mock_token_for_development') {
      return { fid: null, error: 'Invalid issuer' }
    }
    
    // For mock tokens, return a demo FID
    if (token === 'mock_token_for_development') {
      return { fid: '12345', error: null }
    }
    
    // Check audience (should match your domain)
    if (env.NEXT_PUBLIC_HOSTNAME && payload.aud !== env.NEXT_PUBLIC_HOSTNAME) {
      return { fid: null, error: 'Invalid audience' }
    }
    
    // Check expiration
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return { fid: null, error: 'Token expired' }
    }
    
    // Return FID (subject)
    return { fid: payload.sub, error: null }
  } catch (e) {
    console.error('Token verification error:', e)
    return { fid: null, error: 'Authentication failed' }
  }
}

/**
 * Get authenticated user from request
 * Extracts JWT token from Authorization header and verifies it
 */
export async function getUserFromRequest(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return null
    }

    const token = authHeader.substring(7)
    const { fid, error } = await verifyQuickAuthToken(token)

    if (error || !fid) {
      return null
    }

    // Get or create user in database
    const user = await db.user.upsert({
      where: { fid: parseInt(fid) },
      create: {
        fid: parseInt(fid),
      },
      update: {},
    })

    return user
  } catch (error) {
    console.error('getUserFromRequest error:', error)
    return null
  }
}

