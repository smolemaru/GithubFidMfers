import { neynarClient } from "@/lib/neynar"
import { NextRequest, NextResponse } from "next/server"

/**
 * GET /api/neynar/user/[fid]
 * 
 * Example endpoint to get user information by FID using Neynar
 * Usage: GET /api/neynar/user/3
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { fid: string } }
) {
  try {
    const fid = parseInt(params.fid)

    if (isNaN(fid)) {
      return NextResponse.json(
        { error: "Invalid FID format" },
        { status: 400 }
      )
    }

    // Fetch user data from Neynar
    const response = await neynarClient.fetchBulkUsers([fid])

    if (!response.users || response.users.length === 0) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    const user = response.users[0]

    return NextResponse.json({
      fid: user.fid,
      username: user.username,
      displayName: user.display_name,
      pfpUrl: user.pfp_url,
      profile: {
        bio: user.profile.bio.text,
      },
      followerCount: user.follower_count,
      followingCount: user.following_count,
      verifications: user.verifications,
    })
  } catch (error) {
    console.error("Error fetching Neynar user:", error)
    return NextResponse.json(
      { error: "Failed to fetch user data" },
      { status: 500 }
    )
  }
}

