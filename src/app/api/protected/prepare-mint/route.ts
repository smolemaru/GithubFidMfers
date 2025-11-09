import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/quickauth'
import { db } from '@/lib/db'
import { signMintPermit } from '@/lib/nft'
import { uploadNFTToIPFS } from '@/lib/ipfs'
import { neynarClient } from '@/lib/neynar'
import { env } from '@/env'

// Contract deployment timestamp (set this when deploying)
const CONTRACT_DEPLOYMENT_TIME = new Date('2024-12-09T00:00:00Z').getTime()

/**
 * Prepare NFT Mint
 * 
 * Step 1 of the minting process:
 * 1. Verify user has completed generation
 * 2. Upload image + metadata to IPFS
 * 3. Generate EIP-712 signature for presigned minting
 * 4. Return signature + metadata to frontend
 * 
 * Frontend will then:
 * 1. Approve USDC spending
 * 2. Call presignedMint() on contract
 */

interface PrepareMintRequest {
  generationId: string
  walletAddress: string // User's wallet address for minting
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { generationId, walletAddress }: PrepareMintRequest = await request.json()
    
    // Check Neynar score and timing restrictions
    const now = Date.now()
    const hoursSinceDeploy = (now - CONTRACT_DEPLOYMENT_TIME) / (1000 * 60 * 60)
    
    try {
      // Fetch user's Neynar score
      const {users} = await neynarClient.fetchBulkUsers([user.fid])
      const neynarUser = users[0]
      const userScore = neynarUser?.power_badge ? 1.0 : (neynarUser?.follower_count || 0) / 1000 // Rough score calculation
      
      // First 24 hours: only verified users (score > 0.5) or power badge holders
      if (hoursSinceDeploy < 24) {
        const isVerified = neynarUser?.verified_addresses?.eth_addresses?.length > 0
        const hasPowerBadge = neynarUser?.power_badge
        const hasGoodScore = userScore >= 0.5
        
        if (!isVerified && !hasPowerBadge && !hasGoodScore) {
          return NextResponse.json({
            error: 'Early access restricted',
            message: 'For the first 24 hours, minting is only available to verified users with Neynar score > 0.5 or power badge holders. General access opens after 24 hours.',
            hoursRemaining: Math.ceil(24 - hoursSinceDeploy),
          }, { status: 403 })
        }
      }
      
      // After 24 hours + 1 week (192 hours): minting closed
      if (hoursSinceDeploy > 192) {
        return NextResponse.json({
          error: 'Minting period ended',
          message: 'The 1-week minting period has ended. Minting is now closed.',
        }, { status: 403 })
      }
    } catch (error) {
      console.error('Error checking Neynar score:', error)
      // If Neynar is down, allow minting after 24 hours
      if (hoursSinceDeploy < 24) {
        return NextResponse.json({
          error: 'Unable to verify eligibility',
          message: 'Please try again later.',
        }, { status: 503 })
      }
    }

    if (!generationId || !walletAddress) {
      return NextResponse.json(
        { error: 'Missing generationId or walletAddress' },
        { status: 400 }
      )
    }

    // Validate wallet address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return NextResponse.json(
        { error: 'Invalid wallet address format' },
        { status: 400 }
      )
    }

    // Get generation
    const generation = await db.generation.findUnique({
      where: { id: generationId },
      include: { user: true },
    })

    if (!generation) {
      return NextResponse.json(
        { error: 'Generation not found' },
        { status: 404 }
      )
    }

    // Verify ownership
    if (generation.userId !== user.id) {
      return NextResponse.json(
        { error: 'Not your generation' },
        { status: 403 }
      )
    }

    // Check if generation is completed
    if (generation.status !== 'COMPLETED') {
      return NextResponse.json(
        { error: 'Generation not completed yet' },
        { status: 400 }
      )
    }

    // Check if already minted
    if (generation.status === 'MINTED' || generation.tokenId) {
      return NextResponse.json(
        { error: 'Already minted' },
        { status: 400 }
      )
    }

    // Check if image exists
    if (!generation.imageUrl) {
      return NextResponse.json(
        { error: 'No image generated' },
        { status: 400 }
      )
    }

    // Download the image from Python backend
    const imageResponse = await fetch(generation.imageUrl)
    if (!imageResponse.ok) {
      throw new Error('Failed to fetch generated image')
    }

    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer())

    // Upload to IPFS
    console.log('Uploading to IPFS for generation:', generationId)
    const metadataUri = await uploadNFTToIPFS({
      imageBuffer,
      tokenId: user.fid, // Use FID as token ID
      username: user.username,
      fid: user.fid,
    })

    // Generate EIP-712 signature
    console.log('Generating mint signature for FID:', user.fid)
    const signature = await signMintPermit({
      userAddress: walletAddress,
      tokenId: user.fid,
      ipfsURI: metadataUri,
    })

    // Update generation with IPFS data
    await db.generation.update({
      where: { id: generationId },
      data: {
        ipfsMetadataUri: metadataUri,
        tokenId: user.fid,
        status: 'PENDING', // Set to pending until blockchain confirmation
      },
    })

    // Return signature and data to frontend
    return NextResponse.json({
      signature,
      tokenId: user.fid,
      ipfsURI: metadataUri,
      contractAddress: env.NFT_CONTRACT_ADDRESS,
      usdcAddress: env.USDC_CONTRACT_ADDRESS,
      mintCost: '990000', // 0.99 USDC (6 decimals)
    })
  } catch (error) {
    console.error('Error preparing mint:', error)
    return NextResponse.json(
      { error: 'Failed to prepare mint' },
      { status: 500 }
    )
  }
}

