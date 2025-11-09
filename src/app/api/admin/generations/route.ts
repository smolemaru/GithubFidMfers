import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { env } from '@/env'

export async function GET(request: NextRequest) {
  const fid = request.headers.get('x-user-fid')
  
  if (!fid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Verify admin
    const user = await db.user.findUnique({
      where: { fid: parseInt(fid) },
    })

    if (!user || user.primaryAddress?.toLowerCase() !== env.ADMIN_WALLET_ADDRESS.toLowerCase()) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = (page - 1) * limit

    const generations = await db.generation.findMany({
      orderBy: [
        { voteCount: 'desc' },
        { createdAt: 'desc' },
      ],
      skip,
      take: limit,
      include: {
        user: {
          select: {
            fid: true,
            username: true,
          },
        },
      },
    })

    const total = await db.generation.count()
    const top900Count = await db.generation.count({
      where: { selectedFor900: true },
    })

    return NextResponse.json({
      generations: generations.map(g => ({
        id: g.id,
        fid: g.fid,
        imageUrl: g.imageUrl,
        status: g.status,
        voteCount: g.voteCount,
        selectedFor900: g.selectedFor900,
        createdAt: g.createdAt,
        user: g.user,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      top900Count,
    })
  } catch (error) {
    console.error('Error fetching admin generations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch generations' },
      { status: 500 }
    )
  }
}

