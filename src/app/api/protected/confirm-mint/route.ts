import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/quickauth'
import { db } from '@/lib/db'
import { getProvider } from '@/lib/nft'
import { env } from '@/env'

/**
 * Confirm NFT Mint
 * 
 * Step 2 of the minting process (called after user submits transaction):
 * 1. Verify transaction on blockchain
 * 2. Update generation status to 'minted'
 * 3. Record payment
 * 4. Send push notification
 */

interface ConfirmMintRequest {
  generationId: string
  txHash: string
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { generationId, txHash }: ConfirmMintRequest = await request.json()

    if (!generationId || !txHash) {
      return NextResponse.json(
        { error: 'Missing generationId or txHash' },
        { status: 400 }
      )
    }

    // Validate tx hash format
    if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
      return NextResponse.json(
        { error: 'Invalid transaction hash format' },
        { status: 400 }
      )
    }

    // Get generation
    const generation = await db.generation.findUnique({
      where: { id: generationId },
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

    // Wait for transaction confirmation
    const provider = getProvider()
    console.log('Waiting for transaction confirmation:', txHash)
    
    const receipt = await provider.waitForTransaction(txHash, 1) // Wait for 1 confirmation
    
    if (!receipt) {
      return NextResponse.json(
        { error: 'Transaction not found or failed' },
        { status: 400 }
      )
    }

    if (receipt.status !== 1) {
      return NextResponse.json(
        { error: 'Transaction failed on blockchain' },
        { status: 400 }
      )
    }

    // Update generation to minted status
    const updatedGeneration = await db.generation.update({
      where: { id: generationId },
      data: {
        status: 'MINTED',
        txHash: txHash,
        mintedAt: new Date(),
        inGallery: true, // Automatically add to gallery after minting
      },
    })

    // Record payment
    await db.payment.create({
      data: {
        userId: user.id,
        amount: '0.99',
        tokenSymbol: 'USDC',
        txHash: txHash,
        status: 'CONFIRMED',
        purpose: 'MINT',
        generationId: generationId,
      },
    })

    // Send push notification
    try {
      await fetch(`${env.NEXT_PUBLIC_APP_URL}/api/neynar/push-notification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fid: user.fid,
          title: '🎉 Your FID MFER is minted!',
          body: `Your NFT #${generation.tokenId} is now on the blockchain. Share it with your friends!`,
          targetUrl: `${env.NEXT_PUBLIC_APP_URL}/gallery`,
        }),
      })
    } catch (error) {
      console.error('Failed to send push notification:', error)
      // Don't fail the whole request if notification fails
    }

    return NextResponse.json({
      success: true,
      generation: updatedGeneration,
    })
  } catch (error) {
    console.error('Error confirming mint:', error)
    return NextResponse.json(
      { error: 'Failed to confirm mint' },
      { status: 500 }
    )
  }
}

