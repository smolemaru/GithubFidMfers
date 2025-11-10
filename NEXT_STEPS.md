# Next Steps: Database & Backend Setup

## ✅ Completed
- Frontend deployed to Vercel: https://github-fid-mfers.vercel.app/
- All text updated (FIDMfer branding, pricing, etc.)

## 🔧 Required Setup

### 1. Database Setup (Neon PostgreSQL)

**You already have:**
- Neon connection string: Get from your Neon dashboard

**Steps:**
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add: `DATABASE_URL` = your Neon connection string above
3. Run migrations:
   ```bash
   cd GithubFidMfers
   npx prisma migrate deploy
   ```
   Or manually run the SQL from `prisma/schema.prisma` in Neon dashboard

### 2. Backend Setup (Python FastAPI for Image Generation)

**Option A: Deploy to Render (Recommended)**
1. Go to https://dashboard.render.com
2. Create new "Web Service"
3. Connect your GitHub repo
4. Settings:
   - **Name**: `fidmfers-python-backend`
   - **Runtime**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app:app --host 0.0.0.0 --port $PORT`
   - **Environment Variables**:
     - `GEMINI_API_KEY` = your Google Gemini API key
     - `PORT` = 10000 (or auto)

5. After deployment, get the URL (e.g., `https://fidmfers-python-backend.onrender.com`)
6. Add to Vercel env vars: `PYTHON_BACKEND_URL` = your Render backend URL

**Option B: Local Development**
```bash
cd python-backend
pip install -r requirements.txt
uvicorn app:app --reload --port 8000
```

### 3. Required Environment Variables in Vercel

Add these to Vercel Dashboard → Settings → Environment Variables:

```bash
# Database (REQUIRED)
DATABASE_URL=postgresql://user:pass@host.neon.tech/db?sslmode=require
# Get from your Neon dashboard

# Neynar (REQUIRED for Farcaster auth)
NEYNAR_API_KEY=your_neynar_api_key_here
NEXT_PUBLIC_NEYNAR_CLIENT_ID=your_neynar_client_id_here
# Get from https://dev.neynar.com

# AI Generation (REQUIRED)
GEMINI_API_KEY=your_gemini_api_key_here
# Get from: https://aistudio.google.com/app/apikey

# Backend (REQUIRED after deploying Python backend)
PYTHON_BACKEND_URL=https://your-backend-url.onrender.com

# Wallet (REQUIRED for receiving payments)
ADMIN_WALLET_ADDRESS=0xYourWalletAddress

# IPFS (REQUIRED for NFT metadata)
PINATA_JWT=your_pinata_jwt_here
# Get from https://app.pinata.cloud

# RPC (REQUIRED for blockchain)
BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
NEXT_PUBLIC_BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
# Get from https://dashboard.alchemy.com

# App Config (REQUIRED)
NEXT_PUBLIC_APP_URL=https://github-fid-mfers.vercel.app
NEXT_PUBLIC_APP_NAME=FID MFERS
NEXT_PUBLIC_CHAIN_ID=8453
NEXT_PUBLIC_GENERATION_PRICE=0.99
NEXT_PUBLIC_HOSTNAME=github-fid-mfers.vercel.app
NEXT_PUBLIC_USDC_CONTRACT_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913

# Smart Contract (Add after deployment)
NFT_CONTRACT_ADDRESS=
NFT_SIGNER_PRIVATE_KEY=
USDC_CONTRACT_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
```

### 4. Smart Contract Deployment (Later)

After database and backend are working:
1. Deploy NFT contract to Base using Foundry
2. Get contract address
3. Generate signer private key
4. Add to Vercel env vars

### 5. Test the Flow

1. **Database**: Check if users can authenticate via Farcaster
2. **Backend**: Test image generation endpoint
3. **Full Flow**: Generate → Mint → Share

## 📝 Priority Order

1. **Database** (Neon) - Add DATABASE_URL to Vercel, run migrations
2. **Gemini API Key** - Get from Google AI Studio, add to Vercel
3. **Python Backend** - Deploy to Render, add PYTHON_BACKEND_URL to Vercel
4. **Test Generation** - Try generating a FIDMfer
5. **Smart Contract** - Deploy NFT contract (can do later)

## 🚀 After Setup

Once everything is configured:
- Users can connect via Farcaster
- Users can generate FIDMfers
- Users can mint NFTs (after contract deployment)
- Admin panel will work for managing top 900

