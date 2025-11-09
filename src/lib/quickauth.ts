import { env } from '@/env'

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
    
    // Check issuer
    if (payload.iss !== 'https://auth.farcaster.xyz') {
      return { fid: null, error: 'Invalid issuer' }
    }
    
    // Check audience (should match your domain)
    if (payload.aud !== env.NEXT_PUBLIC_HOSTNAME) {
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

