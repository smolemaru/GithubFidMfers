# Render Deployment Setup

## Render Configuration

When creating the Render Web Service, use these settings:

### Basic Settings
- **Name**: `fidmfers-python-backend`
- **Environment**: Python 3
- **Region**: Choose closest to your users

### Build & Deploy
- **Build Command**: 
  ```bash
  cd python-backend && pip install -r requirements.txt
  ```
  
- **Start Command**: 
  ```bash
  cd python-backend && uvicorn api:app --host 0.0.0.0 --port $PORT
  ```

### Environment Variables
Add these in Render Dashboard → Environment:

```bash
GEMINI_API_KEY=your_gemini_api_key_here
NEYNAR_API_KEY=your_neynar_api_key_here
PORT=10000
```

### Important Notes

1. **Templates**: The templates are in `public/templates/` in the repo root. The Python code will automatically find them.

2. **After Deployment**: 
   - Get your Render service URL (e.g., `https://fidmfers-python-backend.onrender.com`)
   - Add to Vercel env vars: `PYTHON_BACKEND_URL=https://your-render-url.onrender.com`

3. **Health Check**: Visit `https://your-render-url.onrender.com/health` to verify it's working.

4. **Free Tier**: Render free tier spins down after 15 minutes of inactivity. First request may take ~30 seconds to wake up.

