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
      custody_address: neynarUser.custody_address,
      verifications: neynarUser.verifications,
      allFields: Object.keys(neynarUser), // Log all available fields
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
    
    const verified = neynarUser.power_badge || false
    
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
    
    // Check pro badge requirement
    if (!hasProBadge) {
      return NextResponse.json({
        score,
        verified,
        mintPrice: '1000000', // 1m USDC if not eligible
        eligible: false,
        reason: 'Pro subscription/badge required',
        hasProBadge: false,
        hasEnoughTokens: false,
        tokenBalance: '0',
      })
    }
    
    // Check token balance requirement
    // Collect ALL verified addresses to check
    const addressesToCheck: string[] = []
    
    // Add verified addresses
    if (neynarUser.verified_addresses?.eth_addresses) {
      addressesToCheck.push(...neynarUser.verified_addresses.eth_addresses)
    }
    
    // Add verifications (these are usually the user's wallets)
    if (neynarUser.verifications) {
      const ethVerifications = neynarUser.verifications.filter((v: string) => v.startsWith('0x'))
      addressesToCheck.push(...ethVerifications)
    }
    
    // Add custody address (last resort - this is the Farcaster custody wallet)
    if (neynarUser.custody_address) {
      addressesToCheck.push(neynarUser.custody_address)
    }
    
    // Remove duplicates
    const uniqueAddresses = [...new Set(addressesToCheck)]
    console.log('All addresses to check for token balance:', uniqueAddresses)
    
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
    
    try {
      // Create public client for Base network
      // Use Alchemy or other RPC provider for Base
      let rpcUrl = env.BASE_RPC_URL
      if (!rpcUrl && env.ALCHEMY_API_KEY) {
        rpcUrl = `https://base-mainnet.g.alchemy.com/v2/${env.ALCHEMY_API_KEY}`
      }
      if (!rpcUrl) {
        rpcUrl = 'https://mainnet.base.org' // Fallback to public RPC
      }
      console.log('Using RPC URL:', rpcUrl.replace(/\/v2\/[^/]+/, '/v2/***'))
      
      const publicClient = createPublicClient({
        chain: base,
        transport: http(rpcUrl),
      })
      
      // Verify RPC connection by getting latest block
      try {
        const blockNumber = await publicClient.getBlockNumber()
        console.log('RPC connection verified. Latest block:', blockNumber.toString())
      } catch (error) {
        console.error('RPC connection failed:', error)
        throw new Error('Failed to connect to Base RPC')
      }
      
      // Verify token contract exists
      try {
        const code = await publicClient.getBytecode({
          address: SMOLEMARU_TOKEN_ADDRESS.toLowerCase() as `0x${string}`,
        })
        if (!code || code === '0x') {
          console.error('Token contract not found at address:', SMOLEMARU_TOKEN_ADDRESS)
          throw new Error('Token contract not found')
        }
        console.log('Token contract verified at:', SMOLEMARU_TOKEN_ADDRESS)
      } catch (error) {
        console.error('Failed to verify token contract:', error)
        throw new Error('Token contract verification failed')
      }
      
      console.log('Checking token balance:', {
        tokenAddress: SMOLEMARU_TOKEN_ADDRESS,
        addressesToCheck: uniqueAddresses.length,
        addresses: uniqueAddresses,
        requiredBalance: '200000',
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
        const decimalsResult = await publicClient.readContract({
          address: SMOLEMARU_TOKEN_ADDRESS,
          abi: balanceOfAbi,
          functionName: 'decimals',
        })
        tokenDecimals = BigInt(decimalsResult as number | bigint | string)
        console.log('Token decimals:', tokenDecimals.toString())
      } catch (error) {
        console.warn('Could not fetch token decimals, assuming 18:', error)
        tokenDecimals = TOKEN_DECIMALS
      }
      
      // Convert required balance to token units (with decimals)
      requiredBalanceWithDecimals = REQUIRED_BALANCE * (BigInt(10) ** tokenDecimals)
      
      // Check token balance for ALL addresses and sum them up
      let totalBalance = BigInt(0)
      let addressWithBalance: string | null = null
      
      for (const address of uniqueAddresses) {
        try {
          // Normalize address to lowercase for consistency
          const normalizedAddress = address.toLowerCase() as `0x${string}`
          console.log('Checking token balance for address:', normalizedAddress)
          
          // Try reading contract with proper address format
          const balanceResult = await publicClient.readContract({
            address: SMOLEMARU_TOKEN_ADDRESS.toLowerCase() as `0x${string}`,
            abi: balanceOfAbi,
            functionName: 'balanceOf',
            args: [normalizedAddress],
          })
          
          const addressBalance = BigInt(balanceResult as bigint | string | number)
          const formattedBalance = formatUnits(addressBalance, Number(tokenDecimals))
          console.log(`Balance for ${normalizedAddress}:`, {
            raw: addressBalance.toString(),
            formatted: formattedBalance,
          })
          
          if (addressBalance > 0) {
            totalBalance += addressBalance
            if (!addressWithBalance) {
              addressWithBalance = normalizedAddress
            }
          }
        } catch (error) {
          console.error(`Failed to check balance for ${address}:`, error)
          // Log the full error for debugging
          if (error instanceof Error) {
            console.error('Error details:', error.message, error.stack)
          }
        }
      }
      
      tokenBalance = totalBalance
      console.log('Total token balance across all addresses:', tokenBalance.toString())
      if (addressWithBalance) {
        console.log('Address with balance:', addressWithBalance)
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
      
      if (!hasEnoughTokens) {
        return NextResponse.json({
          score,
          verified,
          mintPrice: '1000000', // 1m USDC if not eligible
          eligible: false,
          reason: `Insufficient $smolemaru balance. Required: 200,000, Current: ${tokenBalanceFormatted}`,
          hasProBadge: true,
          hasEnoughTokens: false,
          tokenBalance: tokenBalanceFormatted,
          requiredBalance: requiredBalanceFormatted,
          tokenAddress: SMOLEMARU_TOKEN_ADDRESS,
          addressesChecked: uniqueAddresses,
          note: 'If your wallet holding $smolemaru is not in the verified addresses list, please verify it on Farcaster by connecting it to your account',
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
      tokenBalance: formatUnits(tokenBalance, Number(tokenDecimals)),
      requiredBalance: formatUnits(requiredBalanceWithDecimals, Number(tokenDecimals)),
      tokenAddress: SMOLEMARU_TOKEN_ADDRESS,
      addressesChecked: uniqueAddresses,
    })
  } catch (error) {
    console.error('Error checking eligibility:', error)
    return NextResponse.json(
      { error: 'Failed to check eligibility', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

