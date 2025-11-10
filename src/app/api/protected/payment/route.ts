import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { env } from '@/env'
import { getUserFromRequest } from '@/lib/quickauth'

export async function POST(request: NextRequest) {
  // Get user from JWT token
  const user = await getUserFromRequest(request)
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { txHash, amount } = body

    if (!txHash || !amount) {
      return NextResponse.json(
        { error: 'Missing txHash or amount' },
        { status: 400 }
      )
    }

    // Check if payment already exists
    const existingPayment = await db.payment.findUnique({
      where: { txHash },
    })

    if (existingPayment) {
      return NextResponse.json(
        { error: 'Payment already recorded' },
        { status: 400 }
      )
    }

    // Create payment record
    const payment = await db.payment.create({
      data: {
        userId: user.id,
        amount,
        txHash,
        status: 'PENDING',
      },
    })

    // In production, you would verify the transaction on-chain
    // For now, we'll mark it as confirmed immediately
    // TODO: Add on-chain verification using viem
    await db.payment.update({
      where: { id: payment.id },
      data: { status: 'CONFIRMED' },
    })

    return NextResponse.json({
      success: true,
      paymentId: payment.id,
      generationsAvailable: 2,
    })
  } catch (error) {
    console.error('Error recording payment:', error)
    return NextResponse.json(
      { error: 'Failed to record payment' },
      { status: 500 }
    )
  }
}

