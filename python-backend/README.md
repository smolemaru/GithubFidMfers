# VibeMfers Python Backend

FastAPI backend for image generation.

## Setup

1. Create virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Set environment variables:
```bash
export GEMINI_API_KEY="your_key"
export NEYNAR_API_KEY="your_key"
export UPLOAD_ENDPOINT="your_upload_endpoint"  # Optional
```

4. Copy template images to `templates/` directory:
```
python-backend/
├── templates/
│   ├── templateBase.jpg
│   ├── template2.jpg
│   ├── template3.jpg
│   ├── template4.jpg
│   └── template5.jpg
```

## Run

```bash
python api.py
```

Or with uvicorn:
```bash
uvicorn api:app --reload --host 0.0.0.0 --port 8000
```

## API Endpoints

- `POST /generate` - Generate a remixed PFP
- `GET /health` - Health check

## Docker

```bash
docker build -t vibemfers-backend .
docker run -p 8000:8000 -e GEMINI_API_KEY=your_key vibemfers-backend
```

