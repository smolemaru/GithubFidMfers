# Farcaster Mini App Setup Guide

## ✅ Completed
- Real `@farcaster/miniapp-sdk` installed and integrated
- All mock SDK references replaced
- Manifest file created at `public/.well-known/farcaster.json`
- Embed metadata configured in `layout.tsx`

## 🔧 Required Steps to Publish

### 1. Sign the Manifest

**Go to:** https://farcaster.xyz/~/developers/mini-apps/manifest?domain=github-fid-mfers.vercel.app

**Steps:**
1. Connect your Farcaster account
2. Sign the manifest with your custody address
3. Copy the signed `accountAssociation` object
4. Update `public/.well-known/farcaster.json` with the signed data

**After signing, your manifest should look like:**
```json
{
  "accountAssociation": {
    "header": "eyJmaWQiOjEyMTUyLCJ0eXBlIjoiY3VzdG9keSIsImtleSI6IjB4MEJGNDVGOTY3RTkwZmZENjA2MzVkMUFDMTk1MDYyYTNBOUZjQzYyQiJ9",
    "payload": "eyJkb21haW4iOiJnaXRodWItZmlkLW1mZXJzLnZlcmNlbC5hcHAifQ==",
    "signature": "MHhmMTUwMWRjZjRhM2U1NWE1ZjViNGQ5M2JlNGIxYjZiOGE0ZjcwYWQ5YTE1OTNmNDk1NzllNTA2YjJkZGZjYTBlMzI4ZmRiNDZmNmVjZmFhZTU4NjYwYzBiZDc4YjgzMzc2MDAzYTkxNzhkZGIyZGIyZmM5ZDYwYjU2YTlmYzdmMDFj"
  },
  "frame": {
    "version": "1",
    "name": "FID MFERS",
    "iconUrl": "https://github-fid-mfers.vercel.app/icon.png",
    "homeUrl": "https://github-fid-mfers.vercel.app",
    "imageUrl": "https://github-fid-mfers.vercel.app/og-image.png",
    "buttonTitle": "Mint Your FID MFER",
    "splashImageUrl": "https://github-fid-mfers.vercel.app/splash.png",
    "splashBackgroundColor": "#0a0a0f"
  }
}
```

### 2. Add Required Images

Create and upload these images to `public/` folder:

- **icon.png** (200x200px) - App icon
- **og-image.png** (1200x630px) - Open Graph image for sharing
- **splash.png** (200x200px) - Splash screen image

**Or use placeholders for now:**
- icon.png: https://via.placeholder.com/200x200/0a0a0f/4F46E5?text=FM
- og-image.png: https://via.placeholder.com/1200x630/0a0a0f/4F46E5?text=FID+MFERS
- splash.png: https://via.placeholder.com/200x200/0a0a0f/4F46E5?text=FM

### 3. Verify Manifest is Accessible

**Test:**
```bash
curl https://github-fid-mfers.vercel.app/.well-known/farcaster.json
```

**Should return:** HTTP 200 with valid JSON

### 4. Test in Preview Tool

**Go to:**
https://farcaster.xyz/~/developers/mini-apps/preview?url=https://github-fid-mfers.vercel.app

**Verify:**
- App loads without errors
- Authentication works
- UI displays correctly

### 5. Publish to Farcaster

**After manifest is signed and verified:**
1. Share a link to your app in Farcaster
2. The embed preview should appear automatically
3. Users can click to launch the mini app

## 📝 Important Notes

- **Domain must match exactly** - The signed domain in manifest must match your Vercel URL
- **HTTPS required** - Mini apps must be served over HTTPS
- **CORS configured** - Vercel automatically handles CORS for Next.js apps
- **SDK ready()** - App calls `sdk.actions.ready()` on load (already implemented)

## 🔗 Resources

- [Mini Apps Documentation](https://miniapps.farcaster.xyz/docs)
- [Manifest Signing Tool](https://farcaster.xyz/~/developers/mini-apps/manifest)
- [Preview Tool](https://farcaster.xyz/~/developers/mini-apps/preview)

