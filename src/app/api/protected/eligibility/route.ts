import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/quickauth'
import { env } from '@/env'
import { createPublicClient, http, formatUnits } from 'viem'
import { base } from 'viem/chains'

export async function GET(request: NextRequest) {
  console.log('🚀 Eligibility check started')
  console.log('📋 Request headers:', {
    hasAuth: !!request.headers.get('authorization'),
    authPrefix: request.headers.get('authorization')?.substring(0, 20) || 'none',
  })
  
  try {
    const user = await getUserFromRequest(request)
    
    if (!user) {
      console.error('❌ Unauthorized - no user found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('✅ User authenticated:', { fid: user.fid, id: user.id })

    if (!env.NEYNAR_API_KEY) {
      console.error('❌ Neynar API key not configured')
      return NextResponse.json(
        { error: 'Neynar API key not configured' },
        { status: 500 }
      )
    }
    
    console.log('✅ Neynar API key configured')

    // Fetch Neynar user data to get score and verification
    let neynarResponse
    let neynarData
    let neynarUser
    
    try {
      // First try with x-api-key header (recommended format)
      // Add view parameter to get full user data including pro badge
      neynarResponse = await fetch(
        `https://api.neynar.com/v2/farcaster/user/bulk?fids=${user.fid}&view=3`,
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
    
    // Log all available fields to debug - especially check nested objects
    console.log('Neynar user data (full JSON):', JSON.stringify(neynarUser, null, 2))
    console.log('Neynar user data (summary):', {
      fid: neynarUser.fid,
      username: neynarUser.username,
      power_badge: neynarUser.power_badge,
      powerBadge: neynarUser.powerBadge,
      pro_badge: neynarUser.pro_badge,
      proBadge: neynarUser.proBadge,
      follower_count: neynarUser.follower_count,
      verified_addresses: neynarUser.verified_addresses,
      custody_address: neynarUser.custody_address,
      verifications: neynarUser.verifications,
      allFields: Object.keys(neynarUser), // Log all available fields
      // Check nested objects that might contain badge info
      profile: neynarUser.profile,
      active_status: neynarUser.active_status,
      // Check all possible badge fields
      allBadgeFields: {
        power_badge: neynarUser.power_badge,
        powerBadge: neynarUser.powerBadge,
        pro_badge: neynarUser.pro_badge,
        proBadge: neynarUser.proBadge,
        verified: neynarUser.verified,
        is_verified: neynarUser.is_verified,
        // Check if badge info is in profile or other nested objects
        profile_power_badge: neynarUser.profile?.power_badge,
        active_status_power_badge: neynarUser.active_status?.power_badge,
      },
    })
    
    // Try to get all verified addresses (including Base network)
    const allVerifiedAddresses: string[] = []
    if (neynarUser.verified_addresses?.eth_addresses) {
      allVerifiedAddresses.push(...neynarUser.verified_addresses.eth_addresses)
    }
    if (neynarUser.verifications) {
      const ethVerifications = neynarUser.verifications.filter((v: string) => v.startsWith('0x'))
      allVerifiedAddresses.push(...ethVerifications)
    }
    console.log('All verified addresses found:', allVerifiedAddresses)
    
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
    
    // Check multiple possible fields for pro badge/power badge
    // Neynar API might use different field names or value types
    // Handle boolean, string, number, and truthy values
    // Also check nested objects (profile, active_status, etc.)
    const checkBadgeValue = (value: any): boolean => {
      if (value === true || value === 1 || value === 'true' || value === '1') return true
      if (value === false || value === 0 || value === 'false' || value === '0' || value === null || value === undefined) return false
      return !!value // Truthy check for other values
    }
    
    // Check all possible locations for pro badge
    const verified = 
      checkBadgeValue(neynarUser.power_badge) || 
      checkBadgeValue(neynarUser.powerBadge) || 
      checkBadgeValue(neynarUser.pro_badge) || 
      checkBadgeValue(neynarUser.proBadge) ||
      checkBadgeValue(neynarUser.verified) ||
      checkBadgeValue(neynarUser.is_verified) ||
      // Check nested objects
      checkBadgeValue(neynarUser.profile?.power_badge) ||
      checkBadgeValue(neynarUser.profile?.powerBadge) ||
      checkBadgeValue(neynarUser.active_status?.power_badge) ||
      checkBadgeValue(neynarUser.active_status?.powerBadge) ||
      false
    
    console.log('Pro badge check - all fields:', {
      power_badge: neynarUser.power_badge,
      power_badge_type: typeof neynarUser.power_badge,
      powerBadge: neynarUser.powerBadge,
      powerBadge_type: typeof neynarUser.powerBadge,
      pro_badge: neynarUser.pro_badge,
      proBadge: neynarUser.proBadge,
      verified: neynarUser.verified,
      is_verified: neynarUser.is_verified,
      finalVerified: verified,
    })
    
    // Check eligibility requirements:
    // 1. Must have pro subscription/badge (power_badge)
    // 2. Must hold at least 200,000 $smolemaru tokens
    const SMOLEMARU_TOKEN_ADDRESS = '0x19d45c0497de6921d2c7f5800d279123ac36a524' as const
    const REQUIRED_BALANCE = BigInt(200000) // 200,000 tokens (assuming 18 decimals)
    const TOKEN_DECIMALS = BigInt(18)
    
    let eligible = false
    let tokenBalance = BigInt(0)
    let hasProBadge = verified
    let hasEnoughTokens = false
    let tokenDecimals = TOKEN_DECIMALS
    let requiredBalanceWithDecimals = BigInt(0)
    
    // Check pro badge requirement (will be part of final eligibility check)
    console.log('🔍 Checking pro badge requirement...', { hasProBadge, verified, power_badge: neynarUser.power_badge })
    if (hasProBadge) {
      console.log('✅ Pro badge check passed')
    } else {
      console.log('❌ Pro badge check failed - will be included in eligibility result')
    }
    
    // Check token balance requirement
    // Collect ALL verified addresses to check
    console.log('🔍 Collecting addresses to check for token balance...')
    const addressesToCheck: string[] = []
    
    // Add verified addresses
    if (neynarUser.verified_addresses?.eth_addresses) {
      console.log('📝 Adding verified_addresses.eth_addresses:', neynarUser.verified_addresses.eth_addresses)
      addressesToCheck.push(...neynarUser.verified_addresses.eth_addresses)
    }
    
    // Add verifications (these are usually the user's wallets)
    if (neynarUser.verifications) {
      const ethVerifications = neynarUser.verifications.filter((v: string) => v.startsWith('0x'))
      console.log('📝 Adding verifications (ETH):', ethVerifications)
      addressesToCheck.push(...ethVerifications)
    }
    
    // Add custody address (last resort - this is the Farcaster custody wallet)
    if (neynarUser.custody_address) {
      console.log('📝 Adding custody_address:', neynarUser.custody_address)
      addressesToCheck.push(neynarUser.custody_address)
    }
    
    // Remove duplicates and normalize to lowercase
    const uniqueAddresses = [...new Set(addressesToCheck.map(a => a.toLowerCase()))]
    console.log('✅ All unique addresses to check for token balance:', uniqueAddresses)
    
    if (uniqueAddresses.length === 0) {
      console.warn('⚠️  No addresses found to check!')
    }
    
    if (uniqueAddresses.length === 0) {
      console.error('No Ethereum address found for user:', {
        fid: neynarUser.fid,
        verified_addresses: neynarUser.verified_addresses,
        custody_address: neynarUser.custody_address,
        verifications: neynarUser.verifications,
      })
      return NextResponse.json({
        score,
        verified,
        mintPrice: '1000000', // 1m USDC if not eligible
        eligible: false,
        reason: 'No verified Ethereum address found. Please verify your wallet on Farcaster.',
        hasProBadge: true,
        hasEnoughTokens: false,
        tokenBalance: '0',
      })
    }
    
    console.log('✅ Starting token balance check for', uniqueAddresses.length, 'Base ETH wallet(s)')
    console.log('📋 Addresses to check:', uniqueAddresses)
    
    try {
      // Create public client for Base network
      // Use Alchemy or other RPC provider for Base
      console.log('🔧 Setting up RPC connection for Base network...')
      console.log('Environment check:', {
        hasBASE_RPC_URL: !!env.BASE_RPC_URL,
        hasALCHEMY_API_KEY: !!env.ALCHEMY_API_KEY,
        alchemyKeyLength: env.ALCHEMY_API_KEY?.length || 0,
        alchemyKeyPrefix: env.ALCHEMY_API_KEY?.substring(0, 5) || 'none',
      })
      
      let rpcUrl = env.BASE_RPC_URL
      if (!rpcUrl && env.ALCHEMY_API_KEY) {
        rpcUrl = `https://base-mainnet.g.alchemy.com/v2/${env.ALCHEMY_API_KEY}`
        console.log('✅ Using Alchemy RPC (constructed from API key)')
      } else if (rpcUrl) {
        console.log('✅ Using BASE_RPC_URL from env')
      } else {
        rpcUrl = 'https://mainnet.base.org' // Fallback to public RPC
        console.log('⚠️  Using fallback public RPC (no Alchemy key found)')
      }
      console.log('📡 Using RPC URL:', rpcUrl.replace(/\/v2\/[^/]+/, '/v2/***'))
      
      const publicClient = createPublicClient({
        chain: base,
        transport: http(rpcUrl),
      })
      
      // Verify RPC connection by getting latest block
      try {
        const blockNumber = await publicClient.getBlockNumber()
        console.log('✅ RPC connection verified. Latest block:', blockNumber.toString())
      } catch (error) {
        console.error('❌ RPC connection failed:', error)
        throw new Error(`Failed to connect to Base RPC: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
      
      // Verify token contract exists
      try {
        const code = await publicClient.getBytecode({
          address: SMOLEMARU_TOKEN_ADDRESS.toLowerCase() as `0x${string}`,
        })
        if (!code || code === '0x') {
          console.error('❌ Token contract not found at address:', SMOLEMARU_TOKEN_ADDRESS)
          throw new Error('Token contract not found at this address on Base network')
        }
        console.log('✅ Token contract verified at:', SMOLEMARU_TOKEN_ADDRESS)
      } catch (error) {
        console.error('❌ Failed to verify token contract:', error)
        throw new Error(`Token contract verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
      
      console.log('🔍 Checking token balance:', {
        tokenAddress: SMOLEMARU_TOKEN_ADDRESS,
        tokenAddressLowercase: SMOLEMARU_TOKEN_ADDRESS.toLowerCase(),
        addressesToCheck: uniqueAddresses.length,
        addresses: uniqueAddresses.map(a => a.toLowerCase()),
        requiredBalance: '200000',
        network: 'Base',
        rpcUrl: rpcUrl.replace(/\/v2\/[^/]+/, '/v2/***'),
      })
      
      // ERC-20 balanceOf function signature - using standard ERC20 ABI
      const balanceOfAbi = [
        {
          constant: true,
          inputs: [{ name: '_owner', type: 'address' }],
          name: 'balanceOf',
          outputs: [{ name: 'balance', type: 'uint256' }],
          type: 'function',
          stateMutability: 'view',
        },
        {
          constant: true,
          inputs: [],
          name: 'decimals',
          outputs: [{ name: '', type: 'uint8' }],
          type: 'function',
          stateMutability: 'view',
        },
      ] as const
      
      // Get token decimals first (in case it's not 18)
      try {
        console.log('🔍 Fetching token decimals from contract:', SMOLEMARU_TOKEN_ADDRESS.toLowerCase())
        const decimalsResult = await publicClient.readContract({
          address: SMOLEMARU_TOKEN_ADDRESS.toLowerCase() as `0x${string}`,
          abi: balanceOfAbi,
          functionName: 'decimals',
        })
        tokenDecimals = BigInt(decimalsResult as number | bigint | string)
        console.log('✅ Token decimals:', tokenDecimals.toString())
      } catch (error) {
        console.warn('⚠️  Could not fetch token decimals, assuming 18:', error)
        tokenDecimals = TOKEN_DECIMALS
      }
      
      // Convert required balance to token units (with decimals)
      requiredBalanceWithDecimals = REQUIRED_BALANCE * (BigInt(10) ** tokenDecimals)
      
      // Check token balance for ALL Base ETH addresses and sum them up
      console.log('💰 Starting balance check for', uniqueAddresses.length, 'Base ETH wallet(s)...')
      let totalBalance = BigInt(0)
      let addressWithBalance: string | null = null
      
      for (const address of uniqueAddresses) {
        try {
          // Normalize address to lowercase for consistency
          const normalizedAddress = address.toLowerCase() as `0x${string}`
          console.log('🔍 Checking token balance for address:', normalizedAddress)
          
          // Try reading contract with proper address format
          const balanceResult = await publicClient.readContract({
            address: SMOLEMARU_TOKEN_ADDRESS.toLowerCase() as `0x${string}`,
            abi: balanceOfAbi,
            functionName: 'balanceOf',
            args: [normalizedAddress],
          })
          
          const addressBalance = BigInt(balanceResult as bigint | string | number)
          const formattedBalance = formatUnits(addressBalance, Number(tokenDecimals))
          console.log(`💰 Balance for ${normalizedAddress}:`, {
            raw: addressBalance.toString(),
            formatted: formattedBalance,
            hasBalance: addressBalance > 0,
          })
          
          if (addressBalance > 0) {
            totalBalance += addressBalance
            if (!addressWithBalance) {
              addressWithBalance = normalizedAddress
            }
            console.log(`✅ Found balance at ${normalizedAddress}: ${formattedBalance}`)
          } else {
            console.log(`ℹ️  No balance found at ${normalizedAddress}`)
          }
        } catch (error) {
          console.error(`❌ Failed to check balance for ${address}:`, error)
          // Log the full error for debugging
          if (error instanceof Error) {
            console.error('Error details:', {
              message: error.message,
              stack: error.stack,
              name: error.name,
            })
          }
        }
      }
      
      tokenBalance = totalBalance
      console.log('📊 Total token balance across all addresses:', {
        raw: tokenBalance.toString(),
        formatted: formatUnits(tokenBalance, Number(tokenDecimals)),
        addressesChecked: uniqueAddresses.length,
      })
      if (addressWithBalance) {
        console.log('✅ Address with balance found:', addressWithBalance)
      } else {
        console.log('⚠️  No balance found in any checked address')
        console.log('💡 Tip: Make sure the wallet holding $smolemaru is verified on Farcaster')
      }
      
      // Check if user has enough tokens
      hasEnoughTokens = tokenBalance >= requiredBalanceWithDecimals
      
      const tokenBalanceFormatted = formatUnits(tokenBalance, Number(tokenDecimals))
      const requiredBalanceFormatted = formatUnits(requiredBalanceWithDecimals, Number(tokenDecimals))
      
      console.log('Token balance check:', {
        addressesChecked: uniqueAddresses,
        tokenAddress: SMOLEMARU_TOKEN_ADDRESS,
        tokenBalance: tokenBalance.toString(),
        tokenBalanceFormatted,
        requiredBalance: requiredBalanceWithDecimals.toString(),
        requiredBalanceFormatted,
        hasEnoughTokens,
        decimals: tokenDecimals.toString(),
      })
      
      // Log detailed information about addresses checked
      console.log('Addresses checked details:', {
        verified_addresses: neynarUser.verified_addresses?.eth_addresses || [],
        verifications: neynarUser.verifications || [],
        custody_address: neynarUser.custody_address,
        allAddressesChecked: uniqueAddresses,
        note: 'If your wallet holding $smolemaru is not in this list, verify it on Farcaster by connecting it to your account',
      })
      
      // Don't return early - check both requirements together at the end
      if (!hasEnoughTokens) {
        console.log('❌ Insufficient token balance:', {
          required: requiredBalanceFormatted,
          current: tokenBalanceFormatted,
        })
      }
      
      // Final eligibility check: must have BOTH pro badge AND enough tokens
      eligible = hasProBadge && hasEnoughTokens
      
      console.log('✅ Token balance check completed successfully')
      console.log('📊 Final eligibility check:', {
        hasProBadge,
        hasEnoughTokens,
        eligible,
        tokenBalance: formatUnits(tokenBalance, Number(tokenDecimals)),
        requiredBalance: formatUnits(requiredBalanceWithDecimals, Number(tokenDecimals)),
      })
      
      if (!eligible) {
        const reasons: string[] = []
        if (!hasProBadge) {
          reasons.push('Pro subscription/badge required')
        }
        if (!hasEnoughTokens) {
          reasons.push(`Insufficient $smolemaru balance (Required: ${formatUnits(requiredBalanceWithDecimals, Number(tokenDecimals))}, Current: ${formatUnits(tokenBalance, Number(tokenDecimals))})`)
        }
        
        return NextResponse.json({
          score,
          verified,
          mintPrice: '1000000', // 1m USDC if not eligible
          eligible: false,
          reason: reasons.join('. '),
          hasProBadge,
          hasEnoughTokens,
          tokenBalance: formatUnits(tokenBalance, Number(tokenDecimals)),
          requiredBalance: formatUnits(requiredBalanceWithDecimals, Number(tokenDecimals)),
          tokenAddress: SMOLEMARU_TOKEN_ADDRESS,
          addressesChecked: uniqueAddresses,
          note: 'If your wallet holding $smolemaru is not in the verified addresses list, please verify it on Farcaster by connecting it to your account',
        })
      }
    } catch (error) {
      console.error('❌ ERROR checking token balance:', error)
      if (error instanceof Error) {
        console.error('Error message:', error.message)
        console.error('Error stack:', error.stack)
      }
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
    
    // User is eligible - has both pro badge and enough tokens
    // Calculate mint price (all eligible users get same price since they meet requirements)
    const mintPrice = '0.99'
    
    console.log('✅ User is eligible - has both pro badge and enough tokens')
    
    return NextResponse.json({
      score,
      verified,
      mintPrice,
      eligible: true,
      hasProBadge: hasProBadge,
      hasEnoughTokens: hasEnoughTokens,
      tokenBalance: formatUnits(tokenBalance, Number(tokenDecimals)),
      requiredBalance: formatUnits(requiredBalanceWithDecimals, Number(tokenDecimals)),
      tokenAddress: SMOLEMARU_TOKEN_ADDRESS,
      addressesChecked: uniqueAddresses,
      note: 'If your wallet holding $smolemaru is not in the verified addresses list, please verify it on Farcaster by connecting it to your account',
    })
  } catch (error) {
    console.error('❌ Error checking eligibility:', error)
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
      })
    }
    return NextResponse.json(
      { 
        error: 'Failed to check eligibility', 
        details: error instanceof Error ? error.message : 'Unknown error',
        // Include helpful debugging info
        debug: {
          hasAlchemyKey: !!env.ALCHEMY_API_KEY,
          hasBaseRpcUrl: !!env.BASE_RPC_URL,
        }
      },
      { status: 500 }
    )
  }
}

