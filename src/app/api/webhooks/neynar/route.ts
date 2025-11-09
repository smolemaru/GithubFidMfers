import { NextRequest, NextResponse } from 'next/server'
import { env } from '@/env'
import { db } from '@/lib/db'
import crypto from 'crypto'

/**
 * Neynar Webhook Handler
 * 
 * Receives notifications from Neynar Mini App Studio for:
 * - User interactions
 * - App installs/uninstalls
 * - Mini App events
 * 
 * Setup:
 * 1. Go to Mini App Studio: https://studio.neynar.com
 * 2. Add webhook URL: https://your-domain.com/api/webhooks/neynar
 * 3. Copy webhook secret to NEYNAR_WEBHOOK_SECRET env var
 */

interface NeynarWebhookPayload {
  type: string
  data: {
    fid: number
    username?: string
    custody_address?: string
    verifications?: string[]
    [key: string]: any
  }
  created_at: number
}

/**
 * Verify webhook signature from Neynar
 */
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(payload)
  const expectedSignature = hmac.digest('hex')
  return signature === expectedSignature
}

export async function POST(request: NextRequest) {
  try {
    // Get webhook secret
    const webhookSecret = env.NEYNAR_WEBHOOK_SECRET
    if (!webhookSecret) {
      console.warn('NEYNAR_WEBHOOK_SECRET not configured, skipping webhook verification')
    }

    // Get signature from headers
    const signature = request.headers.get('x-neynar-signature')
    const rawBody = await request.text()

    // Verify signature if secret is configured
    if (webhookSecret && signature) {
      const isValid = verifyWebhookSignature(rawBody, signature, webhookSecret)
      if (!isValid) {
        console.error('Invalid webhook signature')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }

    // Parse payload
    const payload: NeynarWebhookPayload = JSON.parse(rawBody)

    console.log('Received Neynar webhook:', payload.type)

    // Handle different webhook types
    switch (payload.type) {
      case 'user.created':
      case 'user.updated':
        await handleUserEvent(payload.data)
        break

      case 'miniapp.installed':
        await handleAppInstalled(payload.data)
        break

      case 'miniapp.uninstalled':
        await handleAppUninstalled(payload.data)
        break

      case 'cast.created':
        // Handle when a user casts about the app
        await handleCastCreated(payload.data)
        break

      default:
        console.log('Unhandled webhook type:', payload.type)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error processing Neynar webhook:', error)
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    )
  }
}

/**
 * Handle user creation/update events
 */
async function handleUserEvent(data: NeynarWebhookPayload['data']) {
  const { fid, username, custody_address, verifications } = data

  try {
    // Update or create user in database
    await db.user.upsert({
      where: { fid },
      update: {
        username: username || `!${fid}`,
        custodyAddress: custody_address,
        verifiedAddresses: verifications || [],
      },
      create: {
        fid,
        username: username || `!${fid}`,
        custodyAddress: custody_address,
        verifiedAddresses: verifications || [],
        generationsLeft: 0, // Start with 0, they need to pay
      },
    })

    console.log(`User ${fid} (${username}) synced from webhook`)
  } catch (error) {
    console.error('Error updating user from webhook:', error)
  }
}

/**
 * Handle app installation
 */
async function handleAppInstalled(data: NeynarWebhookPayload['data']) {
  const { fid, username } = data

  console.log(`User ${fid} (${username}) installed FID MFERS`)

  // Could track analytics, send welcome notification, etc.
  // For now, just log it
}

/**
 * Handle app uninstallation
 */
async function handleAppUninstalled(data: NeynarWebhookPayload['data']) {
  const { fid, username } = data

  console.log(`User ${fid} (${username}) uninstalled FID MFERS`)

  // Could track churn analytics
}

/**
 * Handle cast creation (when users mention/cast about the app)
 */
async function handleCastCreated(data: NeynarWebhookPayload['data']) {
  const { fid, username } = data

  console.log(`User ${fid} (${username}) cast about FID MFERS`)

  // Could reward users for organic promotion
  // Track viral growth, etc.
}

