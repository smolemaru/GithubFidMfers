# Next Steps: Database & Backend Setup

## ✅ Completed
- Frontend deployed to Vercel: https://github-fid-mfers.vercel.app/
- All text updated (FIDMfer branding, pricing, etc.)

## 🔧 Required Setup

### 1. Database Setup (Neon PostgreSQL)

**You already have:**
- Neon connection string: `postgresql://neondb_owner:npg_mgcC8SVXZJY7@ep-summer-mouse-ahzr449z-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require`

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
DATABASE_URL=postgresql://neondb_owner:npg_mgcC8SVXZJY7@ep-summer-mouse-ahzr449z-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require

# Neynar (REQUIRED for Farcaster auth)
NEYNAR_API_KEY=49C6888F-84D9-4A0D-BFE3-80E3CF615E66
NEXT_PUBLIC_NEYNAR_CLIENT_ID=a4d8f15c-88ff-4d22-8c31-a0f6e7980c28

# AI Generation (REQUIRED)
GEMINI_API_KEY=YOUR_GEMINI_KEY_HERE
# Get from: https://aistudio.google.com/app/apikey

# Backend (REQUIRED after deploying Python backend)
PYTHON_BACKEND_URL=https://your-backend-url.onrender.com

# Wallet (REQUIRED for receiving payments)
ADMIN_WALLET_ADDRESS=0x879bb924671d4d4c5bbd23aa98c689fef02b511d

# IPFS (REQUIRED for NFT metadata)
PINATA_JWT=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiI4MzQwMjgyMC05N2I5LTQ0ZDUtODM1Yi1hZDkzNTU0NzQ1YTMiLCJlbWFpbCI6ImF4eWVubmlpcGFyZW5AZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsInBpbl9wb2xpY3kiOnsicmVnaW9ucyI6W3siZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjEsImlkIjoiTllDMSJ9XSwidmVyc2lvbiI6MX0sIm1mYV9lbmFibGVkIjpmYWxzZSwic3RhdHVzIjoiQUNUSVZFIn0sImF1dGhlbnRpY2F0aW9uVHlwZSI6InNjb3BlZEtleSIsInNjb3BlZEtleUtleSI6ImEwZjI2MmQ0YTY1MGI1ZjQ5Y2VkIiwic2NvcGVkS2V5U2VjcmV0IjoiYmNhZmU2NjMyNjk2MDcxODI2YmE0YThkZGM4ZThkMzMwYjkwYWRjOGQ5ODNiMjU2YjljNTViMmIxYTYzMDdiM2YiLCJleHAiOjE3OTQyNDAxMTh9.wjx1E2vc0bixJ-tbkL1vXWegoaSEYcgJmVFBWL8t_uA

# RPC (REQUIRED for blockchain)
BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/_cJQ3B3yIO5msQ-IN-z239yz8V4WxZs6
NEXT_PUBLIC_BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/_cJQ3B3yIO5msQ-IN-z239yz8V4WxZs6

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

