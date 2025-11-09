"""
FastAPI backend for VibeMfers image generation.
Converts the Streamlit app into an API service.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.generativeai as genai
from PIL import Image
import requests
import io
import os
import base64
from typing import Optional
import time

app = FastAPI(title="VibeMfers Generation API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict this
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
NEYNAR_API_KEY = os.getenv("NEYNAR_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
UPLOAD_ENDPOINT = os.getenv("UPLOAD_ENDPOINT")  # Your image upload endpoint

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)


class GenerationRequest(BaseModel):
    fid: int
    pfp_url: str
    bio: str
    follower_count: int
    power_badge: bool
    generation_id: str


def download_image(url: str) -> Image.Image:
    """Download image from URL with retry logic."""
    session = requests.Session()
    retry_strategy = requests.adapters.Retry(
        total=3,
        status_forcelist=[429, 500, 502, 503, 504],
        backoff_factor=2,
    )
    adapter = requests.adapters.HTTPAdapter(max_retries=retry_strategy)
    session.mount("http://", adapter)
    session.mount("https://", adapter)
    
    response = session.get(
        url,
        headers={"User-Agent": "VibeMfers/1.0"},
        timeout=10
    )
    response.raise_for_status()
    
    return Image.open(io.BytesIO(response.content))


def load_templates() -> list[Image.Image]:
    """Load template images."""
    template_dir = os.path.join(os.path.dirname(__file__), "..", "templates")
    template_files = []
    
    # Prioritize templateBase.jpg
    base_template = os.path.join(template_dir, "templateBase.jpg")
    if os.path.exists(base_template):
        template_files.append(base_template)
    
    # Add other templates
    for i in range(2, 6):
        template_file = os.path.join(template_dir, f"template{i}.jpg")
        if os.path.exists(template_file):
            template_files.append(template_file)
    
    templates = []
    for file_path in template_files[:5]:  # Max 5 templates
        templates.append(Image.open(file_path))
    
    return templates


def remix_pfp(
    fid: int,
    pfp_image: Image.Image,
    template_images: list[Image.Image],
    bio: str,
    follower_count: int,
    power_badge: bool,
) -> Image.Image:
    """Generate remixed PFP using Gemini."""
    
    # Build prompt
    template_count = len(template_images)
    style_description = "Highquality 3d realistic Render, dynamic volumetric lighting, depth of field blur, character with realistic shadows."
    negative_prompt = (
        "no low quality, no glitch, no text, no artifacts, no bad anatomy, "
        "no poorly drawn face, no extra hands, no double mouth, no double face, "
        "no multiple faces, no face merge, no double limbs, no multiple limbs, "
        "no extra limbs, no emoji, no objects in background, no background elements, "
        "no weird hair with hats, no hair clipping through headphones, no floating accessories, "
        "no weird overlaps, no clipping artifacts, no double cigarette, no extra cigarette, "
        "no copying character from PFP, no PFP character structure, no PFP body shape, "
        "no PFP head shape, no PFP proportions, no copying hands from PFP, no extra hand pairs, "
        "no PFP hand poses, no copying PFP onto template, no overlaying PFP on template, "
        "no pasting PFP on template, no mixed styles, no 2D elements on 3D, no flat elements"
    )
    
    dynamic_prompt = (
        f"Remix the user's profile picture with my 3D styled circle head character. "
        f"I'm providing {template_count} template images showing my signature 3D character style. "
        f"The FIRST template (templateBase.jpg) shows my 3D character with circle head in a specific pose - use this EXACT pose and structure. "
        f"Other templates show my 3D style variations - use them to understand my rendering style, lighting, textures, and character design. "
        f"CRITICAL - DO NOT COPY CHARACTER FROM PFP: "
        f"1. DO NOT copy character structure, body shape, head shape, or features from PFP - use ONLY MY character structure from template. "
        f"2. DO NOT copy character type from PFP (human, animal, creature, robot) - keep MY character type from template. "
        f"3. DO NOT adapt character structure to match PFP - keep MY EXACT character structure, head shape, and features. "
        f"4. DO NOT copy character proportions, body parts, or anatomy from PFP - use ONLY MY character anatomy from template. "
        f"5. The character structure, body, head, and features come 100% from MY template - ZERO from PFP. "
        f"CRITICAL HAND INSTRUCTIONS - READ CAREFULLY: "
        f"1. Use ONLY the hands from MY FIRST template - EXACTLY as shown, in EXACT same position. "
        f"2. COMPLETELY IGNORE all hands, arms, and hand positions from the user's PFP - DO NOT look at them, DO NOT copy them, DO NOT use them. "
        f"3. DO NOT extract hand poses, hand positions, or arm positions from PFP - these are FORBIDDEN. "
        f"4. The number of hands must EXACTLY match MY template - if MY template has 2 hands, result must have ONLY 2 hands. "
        f"5. DO NOT create extra hands, duplicate hands, or additional hand pairs - use ONLY what exists in MY template. "
        f"6. Hands position, structure, and pose come 100% from MY template - ZERO from PFP. "
        f"CRITICAL REMIX RULES: "
        f"1. Start with MY 3D character structure from FIRST template - keep EXACT same character structure, pose, and body proportions. "
        f"2. Keep MY EXACT character type, head shape, body shape, and features from template - DO NOT change based on PFP. "
        f"3. Extract ONLY visual elements from PFP: colors, color palette, visual style, expression/emotion, accessories, clothing patterns - NOT character structure. "
        f"4. Apply extracted colors, style, expression, accessories, and clothing to MY character structure - do NOT copy character from PFP. "
        f"5. The result must be MY character rendered in MY 3D style, in MY pose and proportions, with PFP visual elements applied. "
        f"6. DO NOT copy the PFP's character structure, pose, body proportions, or hand positions - always use MY character, pose, proportions, and hands. "
        f"7. DO NOT overlay or paste PFP onto my template - remix PFP visual elements into my 3D character style. "
        f"8. Result must be MY character with PFP visual elements - no copying character structure from PFP, no double elements, no overlays. "
        f"Accessories (hats, headphones, cigarettes) must fit naturally on my character - no clipping, no duplicates. "
        f"BACKGROUND: Single solid color. No text, emoji, or objects. "
        f"Use FID {fid} as seed (color hue shifts by {fid % 360} degrees). "
    )
    
    # Add style and personalization
    full_prompt = f"{dynamic_prompt}\n\nStyle: {style_description}\n\n"
    
    if power_badge:
        full_prompt += "POWER USER: This user has a Farcaster power badge (influential member). "
    if follower_count > 10000:
        full_prompt += f"POPULAR: This user has {follower_count} followers. "
    if bio:
        full_prompt += f"Bio: {bio}\n\n"
    
    full_prompt += f"IMPORTANT - Avoid these in the image: {negative_prompt}"
    
    # Configure model
    model = genai.GenerativeModel(
        model_name="models/gemini-2.5-flash-image",
        generation_config={'temperature': 1.0}
    )
    
    # Build content list
    content_list = [full_prompt, pfp_image] + template_images
    
    # Generate
    try:
        response = model.generate_content(content_list)
        
        # Extract image
        for part in response.parts:
            if hasattr(part, 'inline_data') and part.inline_data:
                img_data = part.inline_data.data
                
                if not img_data:
                    continue
                
                # Try to decode as base64 if needed
                if isinstance(img_data, str):
                    img_data = base64.b64decode(img_data)
                
                # Open image
                return Image.open(io.BytesIO(img_data))
        
        raise ValueError("No image data in response")
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")


def upload_image(image: Image.Image, generation_id: str) -> str:
    """Upload image to storage and return URL."""
    # Convert to bytes
    img_byte_arr = io.BytesIO()
    image.save(img_byte_arr, format='PNG')
    img_byte_arr.seek(0)
    
    # Upload to your storage (implement based on your setup)
    # For example, AWS S3, Cloudflare R2, or similar
    # This is a placeholder
    if UPLOAD_ENDPOINT:
        response = requests.post(
            UPLOAD_ENDPOINT,
            files={'file': (f'{generation_id}.png', img_byte_arr, 'image/png')}
        )
        response.raise_for_status()
        return response.json()['url']
    else:
        # Fallback: save locally for development
        output_path = f"outputs/{generation_id}.png"
        os.makedirs("outputs", exist_ok=True)
        image.save(output_path)
        return f"/outputs/{generation_id}.png"


@app.post("/generate")
async def generate(request: GenerationRequest):
    """Generate a remixed PFP."""
    try:
        # Download PFP
        pfp_image = download_image(request.pfp_url)
        
        # Load templates
        template_images = load_templates()
        
        if not template_images:
            raise HTTPException(status_code=500, detail="No templates found")
        
        # Generate remixed image
        remixed_image = remix_pfp(
            fid=request.fid,
            pfp_image=pfp_image,
            template_images=template_images,
            bio=request.bio,
            follower_count=request.follower_count,
            power_badge=request.power_badge,
        )
        
        # Upload image
        image_url = upload_image(remixed_image, request.generation_id)
        
        return {
            "success": True,
            "imageUrl": image_url,
            "generationId": request.generation_id,
        }
        
    except requests.RequestException as e:
        raise HTTPException(status_code=400, detail=f"Failed to download PFP: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

