import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/quickauth'

/**
 * Track Referral
 * 
 * Called when a user first visits the app with a referral code.
 * Records the referral relationship if the user hasn't been referred yet.
 */

interface TrackReferralRequest {
  referralCode: string
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      // User not logged in yet, store referral code in session/cookie for later
      return NextResponse.json({ 
        success: true,
        message: 'Referral code will be applied after login' 
      })
    }

    const { referralCode }: TrackReferralRequest = await request.json()

    if (!referralCode) {
      return NextResponse.json(
        { error: 'Missing referralCode' },
        { status: 400 }
      )
    }

    // Check if user already has a referrer
    if (user.referredBy) {
      return NextResponse.json({
        success: false,
        message: 'User already has a referrer',
      })
    }

    // Check if user is trying to refer themselves
    if (user.referralCode === referralCode) {
      return NextResponse.json({
        success: false,
        message: 'Cannot refer yourself',
      })
    }

    // Find the referrer
    const referrer = await db.user.findUnique({
      where: { referralCode },
    })

    if (!referrer) {
      return NextResponse.json(
        { error: 'Invalid referral code' },
        { status: 404 }
      )
    }

    // Update user with referral
    await db.user.update({
      where: { id: user.id },
      data: {
        referredBy: referralCode,
      },
    })

    // Increment referrer's count
    await db.user.update({
      where: { id: referrer.id },
      data: {
        referralCount: {
          increment: 1,
        },
      },
    })

    return NextResponse.json({
      success: true,
      message: `Referred by @${referrer.username || referrer.fid}`,
    })
  } catch (error) {
    console.error('Error tracking referral:', error)
    return NextResponse.json(
      { error: 'Failed to track referral' },
      { status: 500 }
    )
  }
}

