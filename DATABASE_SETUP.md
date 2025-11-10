# Database Setup Guide

## ⚠️ CRITICAL: Database Tables Don't Exist

The error shows: `The table public.User does not exist in the current database`

You need to run Prisma migrations to create the tables.

## Quick Fix (Using Vercel):

### Option 1: Run Migration via Vercel Build Command

1. Go to Vercel Dashboard → Your Project → Settings → Build & Development Settings
2. Add this to **Build Command**:
   ```bash
   npx prisma generate && npx prisma db push && npm run build
   ```
3. Redeploy

### Option 2: Run Migration Locally (Recommended)

1. **Set DATABASE_URL in Vercel:**
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add: `DATABASE_URL` = `your_neon_connection_string_here`
   - Make sure it's set for **Production** environment

2. **Run migration locally:**
   ```bash
   cd GithubFidMfers
   npx prisma generate
   npx prisma db push
   ```

3. **Or create a proper migration:**
   ```bash
   cd GithubFidMfers
   npx prisma migrate dev --name init
   ```

4. **Push to GitHub** - Vercel will auto-deploy

### Option 3: Use Prisma Studio (Quick Test)

```bash
cd GithubFidMfers
npx prisma studio
```

This will open a web UI where you can see if tables exist.

## Verify Database Connection:

1. Check `DATABASE_URL` in Vercel env vars matches your Neon database
2. Test connection:
   ```bash
   npx prisma db pull
   ```

## After Migration:

The following tables should exist:
- `User`
- `Generation`
- `Payment`
- `Vote`

## Troubleshooting:

### Error: "Can't reach database server"
- Check `DATABASE_URL` is correct
- Make sure Neon database is running
- Check connection string includes `?sslmode=require`

### Error: "Migration failed"
- Make sure you have write permissions on the database
- Check if tables already exist (might need to drop and recreate)

## Next Steps:

After running migrations:
1. ✅ Tables created
2. ✅ Authentication will work
3. ✅ Generation will work
4. ✅ Gallery will work

**Run the migration NOW to fix authentication!**

