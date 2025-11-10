import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/quickauth'
import { env } from '@/env'
import { createPublicClient, http, formatUnits } from 'viem'
import { base } from 'viem/chains'

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
    
    // Check eligibility requirements:
    // 1. Must have pro subscription/badge (power_badge)
    // 2. Must hold at least 200,000 $smolemaru tokens
    const SMOLEMARU_TOKEN_ADDRESS = '0x19d45c0497de6921d2c7f5800d279123ac36a524' as const
    const REQUIRED_BALANCE = 200000n // 200,000 tokens (assuming 18 decimals)
    const TOKEN_DECIMALS = 18n
    
    let eligible = false
    let tokenBalance = 0n
    let hasProBadge = verified
    let hasEnoughTokens = false
    
    // Check pro badge requirement
    if (!hasProBadge) {
      return NextResponse.json({
        score,
        verified,
        mintPrice: '0.00',
        eligible: false,
        reason: 'Pro subscription/badge required',
        hasProBadge: false,
        hasEnoughTokens: false,
        tokenBalance: '0',
      })
    }
    
    // Check token balance requirement
    const userAddress = neynarUser.verified_addresses?.eth_addresses?.[0]
    if (!userAddress) {
      return NextResponse.json({
        score,
        verified,
        mintPrice: '0.00',
        eligible: false,
        reason: 'No verified Ethereum address found',
        hasProBadge: true,
        hasEnoughTokens: false,
        tokenBalance: '0',
      })
    }
    
    try {
      // Create public client for Base network
      const rpcUrl = env.BASE_RPC_URL || 'https://mainnet.base.org'
      const publicClient = createPublicClient({
        chain: base,
        transport: http(rpcUrl),
      })
      
      // ERC-20 balanceOf function signature
      const balanceOfAbi = [
        {
          constant: true,
          inputs: [{ name: '_owner', type: 'address' }],
          name: 'balanceOf',
          outputs: [{ name: 'balance', type: 'uint256' }],
          type: 'function',
        },
        {
          constant: true,
          inputs: [],
          name: 'decimals',
          outputs: [{ name: '', type: 'uint8' }],
          type: 'function',
        },
      ] as const
      
      // Get token balance
      tokenBalance = await publicClient.readContract({
        address: SMOLEMARU_TOKEN_ADDRESS,
        abi: balanceOfAbi,
        functionName: 'balanceOf',
        args: [userAddress as `0x${string}`],
      })
      
      // Get token decimals (in case it's not 18)
      let tokenDecimals = TOKEN_DECIMALS
      try {
        const decimals = await publicClient.readContract({
          address: SMOLEMARU_TOKEN_ADDRESS,
          abi: balanceOfAbi,
          functionName: 'decimals',
        })
        tokenDecimals = BigInt(decimals)
      } catch (error) {
        console.warn('Could not fetch token decimals, assuming 18:', error)
      }
      
      // Convert required balance to token units (with decimals)
      const requiredBalanceWithDecimals = REQUIRED_BALANCE * (10n ** tokenDecimals)
      
      // Check if user has enough tokens
      hasEnoughTokens = tokenBalance >= requiredBalanceWithDecimals
      
      if (!hasEnoughTokens) {
        const balanceFormatted = formatUnits(tokenBalance, Number(tokenDecimals))
        return NextResponse.json({
          score,
          verified,
          mintPrice: '0.00',
          eligible: false,
          reason: `Insufficient $smolemaru balance. Required: 200,000, Current: ${balanceFormatted}`,
          hasProBadge: true,
          hasEnoughTokens: false,
          tokenBalance: balanceFormatted,
          requiredBalance: '200000',
        })
      }
      
      eligible = true
    } catch (error) {
      console.error('Error checking token balance:', error)
      return NextResponse.json(
        { 
          error: 'Failed to check token balance', 
          details: error instanceof Error ? error.message : 'Unknown error',
          hasProBadge: true,
          hasEnoughTokens: false,
        },
        { status: 500 }
      )
    }
    
    // Calculate mint price (all eligible users get same price since they meet requirements)
    const mintPrice = '0.99'
    
    return NextResponse.json({
      score,
      verified,
      mintPrice,
      eligible: true,
      hasProBadge: true,
      hasEnoughTokens: true,
      tokenBalance: formatUnits(tokenBalance, 18),
    })
  } catch (error) {
    console.error('Error checking eligibility:', error)
    return NextResponse.json(
      { error: 'Failed to check eligibility', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

