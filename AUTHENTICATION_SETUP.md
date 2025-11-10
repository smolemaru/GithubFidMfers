# Authentication Setup Guide

## ⚠️ IMPORTANT: Sign Manifest First

**The app will NOT authenticate until the manifest is signed!**

## Steps to Enable Authentication:

### 1. Sign the Manifest (REQUIRED)

**Go to:** https://farcaster.xyz/~/developers/mini-apps/manifest?domain=fid-mfers.vercel.app

**Steps:**
1. Connect your Farcaster account
2. Sign the manifest with your custody address
3. Copy the signed `accountAssociation` object:
   ```json
   {
     "header": "...",
     "payload": "...",
     "signature": "..."
   }
   ```
4. Update `public/.well-known/farcaster.json` with the signed data
5. Push to GitHub (Vercel will auto-deploy)

### 2. Verify Manifest is Accessible

**Test:**
```bash
curl https://fid-mfers.vercel.app/.well-known/farcaster.json
```

**Should return:** HTTP 200 with signed manifest including `accountAssociation`

### 3. Test Authentication

After signing:
1. Open the app in a Farcaster client (Warpcast, etc.)
2. The SDK should automatically authenticate
3. Check browser console for any errors

## How Authentication Works:

1. **Farcaster SDK** (`@farcaster/miniapp-sdk`) calls `sdk.quickAuth.getToken()`
2. SDK checks if manifest is signed and accessible
3. If signed, SDK returns a JWT token
4. App sends token to `/api/protected/me` endpoint
5. Backend verifies token and returns user profile

## Troubleshooting:

### Error: "No token received from SDK"
- **Cause:** Manifest not signed or not accessible
- **Fix:** Sign manifest at the link above

### Error: "Invalid audience"
- **Cause:** Token audience doesn't match domain
- **Fix:** Make sure `NEXT_PUBLIC_HOSTNAME` in Vercel env vars matches your domain

### Error: "Failed to fetch profile"
- **Cause:** Backend API error or Neynar API issue
- **Fix:** Check Vercel logs and ensure `NEYNAR_API_KEY` is set

## Environment Variables Required:

```env
NEXT_PUBLIC_HOSTNAME=fid-mfers.vercel.app
NEYNAR_API_KEY=your_key_here
```

## After Signing Manifest:

1. ✅ Manifest is signed and accessible
2. ✅ SDK can get authentication token
3. ✅ App can fetch user profile
4. ✅ Generation and other features work

**The manifest MUST be signed before authentication will work!**

