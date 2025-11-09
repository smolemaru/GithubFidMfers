# 🎨 FID MFERS

AI-powered NFT minting platform for Farcaster users on Base.

## 🚀 Quick Start

```bash
npm install
npx prisma generate
npm run dev
```

## 📋 Environment Setup

Copy `env.example` to `.env.local` and configure:

### Required Services

- **Neynar** (FREE) - Farcaster API: https://dev.neynar.com
- **Pinata** (FREE) - IPFS storage: https://pinata.cloud
- **Alchemy** (FREE) - Base RPC: https://alchemy.com
- **Neon** (FREE) - Database: https://neon.tech
- **Gemini** (FREE) - AI API: https://ai.google.dev
- **Render** ($5/mo) - Python backend: https://render.com
- **Vercel** (FREE) - Frontend: https://vercel.com

## 🏗️ Architecture

```
├── src/              # Next.js frontend
├── python-backend/   # FastAPI AI service
├── contracts/        # Solidity smart contracts
└── prisma/          # Database schema
```

## 🔧 Tech Stack

- **Frontend**: Next.js 15, React 19, Tailwind CSS
- **Backend**: Python FastAPI, Next.js API Routes
- **Database**: PostgreSQL (Prisma ORM)
- **Blockchain**: Solidity, Foundry, Base Network
- **Storage**: IPFS (Pinata)

## 💰 Revenue Model

- Mint: 0.99 USDC → Your wallet
- Regeneration: 0.99 USDC → Your wallet
- Operating cost: $5/month (Render)

## 🎯 Features

- ✅ AI image generation based on Farcaster profile
- ✅ NFT minting on Base (0.99 USDC)
- ✅ Community voting (Top 900 selection)
- ✅ Referral system with tracking
- ✅ Social sharing integration
- ✅ Admin panel
- ✅ 3D gallery
- ✅ Neynar score gating (first 24h)

## 🚢 Deployment

### Backend (Render)
```bash
# Deploy python-backend/ folder
# Set env: GEMINI_API_KEY
```

### Frontend (Vercel)
```bash
vercel --prod
# Add all env vars from .env.local
```

### Smart Contract (Foundry)
```bash
cd contracts
forge install
forge build
forge script script/Deploy.s.sol --broadcast --verify
```

## 📖 Documentation

See inline comments in code files for detailed implementation notes.

## 📄 License

MIT License

## 🙏 Credits

Built with Neynar, Solady, OpenZeppelin, and Pinata.
