import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/quickauth'
import { env } from '@/env'

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!env.NEYNAR_API_KEY) {
      return NextResponse.json(
        { error: 'Neynar API key not configured' },
        { status: 500 }
      )
    }

    // Fetch Neynar user data to get score and verification
    let neynarResponse
    let neynarData
    let neynarUser
    
    try {
      // First try with x-api-key header (recommended format)
      neynarResponse = await fetch(
        `https://api.neynar.com/v2/farcaster/user/bulk?fids=${user.fid}`,
        {
          headers: {
            'x-api-key': env.NEYNAR_API_KEY,
            'x-neynar-experimental': 'true', // Filter spam accounts
          },
        }
      )
      
      if (!neynarResponse.ok) {
        // If that fails, try with api_key header (alternative format)
        console.warn('x-api-key header failed, trying api_key header...')
        neynarResponse = await fetch(
          `https://api.neynar.com/v2/farcaster/user/bulk?fids=${user.fid}`,
          {
            headers: {
              'api_key': env.NEYNAR_API_KEY,
            },
          }
        )
      }
      
      if (!neynarResponse.ok) {
        const errorText = await neynarResponse.text()
        console.error('Neynar API error:', neynarResponse.status, errorText)
        return NextResponse.json(
          { error: `Failed to fetch Neynar data: ${neynarResponse.status}`, details: errorText },
          { status: neynarResponse.status }
        )
      }
      
      neynarData = await neynarResponse.json()
      neynarUser = neynarData.users?.[0]
    } catch (fetchError) {
      console.error('Neynar fetch error:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch Neynar data', details: fetchError instanceof Error ? fetchError.message : 'Unknown error' },
        { status: 500 }
      )
    }
    
    if (!neynarUser) {
      console.error('Neynar user not found in response:', neynarData)
      return NextResponse.json(
        { error: 'User not found in Neynar response' },
        { status: 404 }
      )
    }
    
    // Log all available fields to debug
    console.log('Neynar user data:', {
      fid: neynarUser.fid,
      username: neynarUser.username,
      power_badge: neynarUser.power_badge,
      follower_count: neynarUser.follower_count,
      verified_addresses: neynarUser.verified_addresses,
      allFields: Object.keys(neynarUser), // Log all available fields
    })
    
    // Get Neynar score - check multiple possible fields
    let score = 0
    
    // Try different possible score fields
    if (neynarUser.neynar_score !== undefined) {
      score = neynarUser.neynar_score
    } else if (neynarUser.score !== undefined) {
      score = neynarUser.score
    } else if (neynarUser.user_score !== undefined) {
      score = neynarUser.user_score
    } else if (neynarUser.quality_score !== undefined) {
      score = neynarUser.quality_score
    }
    
    // If no score available, calculate a rough estimate based on filtered follower count
    if (score === 0 && neynarUser.follower_count) {
      // Rough estimate based on filtered follower count:
      // 1000 filtered followers = 0.1 score, 5000 = 0.5, 10000 = 1.0
      score = Math.min(neynarUser.follower_count / 10000, 1.0)
      console.log('Using fallback score calculation based on filtered followers:', score)
    }
    
    const verified = neynarUser.power_badge || false
    
    // Calculate mint price based on score and verification
    let mintPrice: string
    
    if (score >= 1.0 && verified) {
      mintPrice = '0.35'
    } else if (score >= 0.5 && score < 1.0) {
      mintPrice = '0.99'
    } else if (score < 0.5) {
      mintPrice = '3.00'
    } else {
      // Default to 0.99 if score is exactly 1.0 but not verified
      mintPrice = '0.99'
    }
    
    return NextResponse.json({
      score,
      verified,
      mintPrice,
      eligible: true,
    })
  } catch (error) {
    console.error('Error checking eligibility:', error)
    return NextResponse.json(
      { error: 'Failed to check eligibility', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

