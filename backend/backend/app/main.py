from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Body, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Dict, Any, Optional, Annotated
import os
import shutil
import cv2
import numpy as np
from io import BytesIO
import base64
import time
import asyncio
from pathlib import Path
from dotenv import load_dotenv

from azure.storage.blob import BlobServiceClient, ContentSettings

from app.database import get_connection
from app.utils.compare import compare_images as structural_compare
from app.utils.otp import generate_otp, verify_otp

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Azure Configuration
AZURE_CONNECTION_STRING = os.getenv("AZURE_CONNECTION_STRING")
AZURE_CONTAINER_NAME = os.getenv("AZURE_CONTAINER_NAME", "uploads")

if not AZURE_CONNECTION_STRING:
    print("WARNING: AZURE_CONNECTION_STRING not found. Azure uploads will fail.")

# Initialize Blob Service Client (Lazy loaded or global)
try:
    if AZURE_CONNECTION_STRING:
        blob_service_client = BlobServiceClient.from_connection_string(AZURE_CONNECTION_STRING)
    else:
        blob_service_client = None
except Exception as e:
    print(f"Failed to initialize Azure Blob Service: {e}")
    blob_service_client = None


FILE_TYPE_LIST = ["inspections", "profiles", "documents", "others", "front", "back", "left", "right", "roof", "interior", "damage1", "damage2", "damage3"]

# Define Paths Correctly
BASE_DIR = os.path.dirname(os.path.abspath(__file__)) # .../backend/app
BACKEND_ROOT = os.path.dirname(BASE_DIR) # .../backend
FILES_PATH = os.path.join(BACKEND_ROOT, "files") # .../backend/files

# Ensure files directory exists
os.makedirs(FILES_PATH, exist_ok=True)

# Mount /files to point to the correct backend/backend/files location
app.mount("/files", StaticFiles(directory=FILES_PATH), name="files")

def upload_file_to_azure(file_type: str, file: UploadFile) -> str:
    if not blob_service_client:
        return None  # Indicate failure/no-service

    # 1. Save locally first (Backup / Staging) using the local path logic
    # We call the existing function or replicate logic to ensure it's saved to FILES_PATH
    try:
        # Note: upload_file_local consumes the stream, so we rely on it to reset or we save it there.
        # Let's save it directly here to control the flow and filename perfectly.
        
        # Validation
        if file_type not in FILE_TYPE_LIST:
            raise HTTPException(status_code=400, detail="Invalid file type.")
        
        # Name generation
        safe_filename = Path(file.filename or "unknown").name
        if ".." in safe_filename or safe_filename.startswith("/"):
             raise HTTPException(status_code=400, detail="Invalid filename.")
        
        timestamp = int(time.time() * 1000)
        saved_filename = f"{timestamp}_{safe_filename}"
        
        # Define Local Path (FILES_PATH is explicitly mentioned)
        local_save_dir = Path(FILES_PATH) / file_type
        local_save_dir.mkdir(parents=True, exist_ok=True)
        local_file_path = local_save_dir / saved_filename
        
        # Write to Local Disk
        file.file.seek(0)
        with open(local_file_path, "wb") as buffer:
             shutil.copyfileobj(file.file, buffer)
             
        print(f"DEBUG: Local backup saved at {local_file_path}")

        # 2. Upload to Azure (using the local file)
        blob_name = f"{file_type}/{saved_filename}"
        
        container_client = blob_service_client.get_container_client(AZURE_CONTAINER_NAME)
        if not container_client.exists():
            container_client.create_container()
            
        blob_client = container_client.get_blob_client(blob_name)
        
        # Open the local file to upload (safer than reusing the spool stream)
        with open(local_file_path, "rb") as data:
             blob_client.upload_blob(
                data, 
                overwrite=True, 
                content_settings=ContentSettings(content_type=file.content_type)
            )
        
        return saved_filename

    except Exception as e:
        print(f"Azure upload failed: {e}")
        return None

def upload_file_local(file_type: str, file: UploadFile) -> str:
    if file_type not in FILE_TYPE_LIST:
        raise HTTPException(status_code=400, detail="Invalid file type.")

    safe_filename = Path(file.filename or "unknown").name
    if ".." in safe_filename:
        raise HTTPException(status_code=400, detail="Invalid filename")

    timestamp = int(time.time() * 1000)
    saved_filename = f"{timestamp}_{safe_filename}"
    
    # Save path: .../files/{file_type}/{filename}
    save_dir = Path(FILES_PATH) / file_type
    save_dir.mkdir(parents=True, exist_ok=True)
    file_path = save_dir / saved_filename

    try:
        file.file.seek(0)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        return saved_filename
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Local upload failed: {str(e)}")

@app.post("/upload")
async def upload_file_endpoint(
    request: Request,
    fileType: Annotated[str, Form()], 
    file: UploadFile = File(...)
):
    # Try Azure First
    file_name = None
    url = ""
    
    if blob_service_client:
        try:
            # We wrap sync Azure call
            file_name = await asyncio.to_thread(upload_file_to_azure, fileType, file)
            if file_name:
                url = f"https://{blob_service_client.account_name}.blob.core.windows.net/{AZURE_CONTAINER_NAME}/{fileType}/{file_name}"
        except Exception as e:
            print(f"Azure attempt failed: {e}")
            # Fallthrough to local
    
    # Fallback to local if Azure invalid or failed
    if not file_name:
        file_name = await asyncio.to_thread(upload_file_local, fileType, file)
        # Construct local URL (assuming standard execution on port 8000)
        # Note: request.base_url could be better but sticking to simple string for now
        url = f"{request.base_url}files/{fileType}/{file_name}"

    return JSONResponse(content={
        "status": "success",
        "message": "File uploaded successfully",
        "data": {
            "fileName": file_name,
            "url": url
        }
    }, status_code=201)

# These paths should now use FILES_PATH if they are still relevant for other functions
UPLOAD_BASE = os.path.join(FILES_PATH, "inspections")
IDEAL_PATH = os.path.join(FILES_PATH, "ideal.png")

os.makedirs(UPLOAD_BASE, exist_ok=True)

@app.post("/upload/{file_type}")
async def upload_file_legacy(request: Request, file_type: str, file: UploadFile = File(...)):
    """Legacy endpoint: Prefer /upload"""
    # Reuse valid logic
    try:
        # We can implement simple local save directly to ensure it works
        file_name = await asyncio.to_thread(upload_file_local, file_type, file)
        url = f"{request.base_url}files/{file_type}/{file_name}"
        return {"filename": file_name, "url": url} 
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/auth/request-otp")
def request_otp(phone: str = Form(...)):
    otp = generate_otp(phone)
    return {"message": "OTP sent", "otp": otp}

@app.post("/auth/verify-otp")
def verify_login(phone: str = Form(...), otp: int = Form(...)):
    if not verify_otp(phone, otp):
        return {"error": "Invalid OTP"}
    try:
        conn = get_connection()
        cur = conn.cursor()
        
        cur.execute("SELECT id FROM users WHERE phone=%s", (phone,))
        user = cur.fetchone()
        if user is None:
            cur.execute("INSERT INTO users (phone) VALUES (%s)", (phone,))
            conn.commit()
            user_id = cur.lastrowid
        else:
            user_id = user[0]
        cur.close()
        conn.close()
        return {"user_id": user_id}
    except Exception as e:
        return {"error": "Database error", "details": str(e)}

@app.post("/auth/demo-login")
def demo_login():
    """Create or get a demo user so we have a valid REAL ID for formatting."""
    phone = "+0000000000"
    try:
        conn = get_connection()
        cur = conn.cursor()
        
        cur.execute("SELECT id FROM users WHERE phone=%s", (phone,))
        user = cur.fetchone()
        if user is None:
            cur.execute("INSERT INTO users (phone) VALUES (%s)", (phone,))
            conn.commit()
            user_id = cur.lastrowid
        else:
            user_id = user[0]
        cur.close()
        conn.close()
        return {"user_id": user_id}
    except Exception as e:
        return {"error": "Database error", "details": str(e)}

@app.post("/inspection/start")
def start_inspection(user_id: int = Form(...)):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("INSERT INTO inspections (user_id) VALUES (%s)", (user_id,))
    conn.commit()
    inspection_id = cur.lastrowid
    cur.close()
    conn.close()
    folder = os.path.join(UPLOAD_BASE, str(inspection_id))
    os.makedirs(folder, exist_ok=True)
    return {"inspection_id": inspection_id}

@app.post("/inspection/upload-image")
async def upload_image(
    inspection_id: int = Form(...),
    image_type: str = Form(...),
    file: UploadFile = File(...)
):
    folder = os.path.join(UPLOAD_BASE, str(inspection_id))
    os.makedirs(folder, exist_ok=True)

    image_path = os.path.join(folder, f"{image_type}.jpg")
    with open(image_path, "wb") as f:
        f.write(await file.read())

    similarity = 0.0
    if os.path.exists(IDEAL_PATH):
        similarity = compare_images(IDEAL_PATH, image_path)

    label = "defective" if similarity < 0.9 else "good"
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO inspection_images
        (inspection_id, image_type, image_path, similarity, label)
        VALUES (%s,%s,%s,%s,%s)
        """,
        (inspection_id, image_type, image_path, similarity, label)
    )
    conn.commit()
    cur.close()
    conn.close()
    return {
        "image_type": image_type,
        "similarity": similarity,
        "label": label
    }

from typing import List, Dict, Any, Optional
class SubmissionModel(BaseModel):
    userId: str
    carModel: str
    photoIds: List[str]
    analysisResults: List[Dict[str, Any]]  # New field for analysis data

import difflib

def results_to_text(results: List[Dict[str, Any]]) -> str:
    lines = []
    # Identify parts by index if names are missing, assuming order is consistent
    part_names = ["Front View", "Right Side", "Rear View", "Left Side", "Front Windshield", "Interior Front", "Interior Back", "Dashboard", "Trunk"]
    
    for i, item in enumerate(results):
        part = part_names[i] if i < len(part_names) else f"Part {i+1}"
        severity = item.get('severity', 'none')
        desc = item.get('description', 'No description provided')
        
        lines.append(f"--- {part} ---")
        lines.append(f"Severity: {severity}")
        lines.append(f"Description: {desc}")
        lines.append("") # Empty line separator
    
    return "\n".join(lines)

def compare_reports(old_text: str, new_text: str) -> str:
    old_lines = old_text.splitlines()
    new_lines = new_text.splitlines()

    diff = difflib.unified_diff(
        old_lines,
        new_lines,
        fromfile="Previous Report",
        tofile="Recent Report",
        lineterm=""
    )

    return "\n".join(diff)

def generate_comparison_report(old_results: List[Dict[str, Any]], new_results: List[Dict[str, Any]]) -> str:
    old_text = results_to_text(old_results)
    new_text = results_to_text(new_results)
    
    comparison_result = compare_reports(old_text, new_text)
    
    # Add a header similar to the user's request
    header = "COMPARISON REPORT\n" + ("=" * 60) + "\n\n"
    
    if not comparison_result:
        return header + "No significant changes detected between the reports."
        
    return header + comparison_result

@app.post("/submissions")
def submit_inspection(submission: SubmissionModel):
    conn = get_connection()
    # In MockConnection, we can treat it like a store
    # Fetch last inspection for this user/car
    
    # 1. Retrieve history from Mock DB (or Real DB)
    # We will assume MOCK_DATA structure for now.
    # In a real SQL, we would SELECT analysis_json FROM inspections WHERE user_id=... ORDER BY created_at DESC LIMIT 1
    
    previous_results = []
    if hasattr(conn, 'get_last_inspection_results'):
        # If we added a helper method to MockConnection
        previous_results = conn.get_last_inspection_results(submission.userId)
    else:
        # Fallback manual Mock access (since we are using the MOCK_DATA global in database.py)
        # We can't easily access MOCK_DATA here without importing it or using a method
        pass

    # For pure demonstration, let's implement a simple in-memory store IN MAIN.PY for 'last_submission'
    # This is a hack for the session since database.py Mock is separate
    global _LAST_SUBMISSION_STORE
    if '_LAST_SUBMISSION_STORE' not in globals():
        _LAST_SUBMISSION_STORE = {}
        
    user_key = submission.userId + "_" + submission.carModel
    old_data = _LAST_SUBMISSION_STORE.get(user_key)
    
    comparison_text = "See new report details."
    if old_data:
        comparison_text = generate_comparison_report(old_data, submission.analysisResults)
    else:
        comparison_text = "First inspection recorded. No prior history to compare."

    # Save new as current
    _LAST_SUBMISSION_STORE[user_key] = submission.analysisResults

    return {
        "status": "success", 
        "submission_id": 12345,
        "comparison_report": comparison_text
    }

@app.delete("/photos/{photo_id}")
def delete_photo(photo_id: str):
    # In a real app, delete from DB and filesystem
    # For now, just acknowledge
    return {"status": "deleted", "photo_id": photo_id}

@app.get("/")
def root():
    return {"status": "backend running"}

@app.post("/compare-images")
async def compare_images_endpoint(old_image: UploadFile = File(...), new_image: UploadFile = File(...)):
    # Read images
    old_bytes = await old_image.read()
    new_bytes = await new_image.read()
    
    # Decode images
    old_img_np = np.frombuffer(old_bytes, np.uint8)
    new_img_np = np.frombuffer(new_bytes, np.uint8)
    
    old_img = cv2.imdecode(old_img_np, cv2.IMREAD_COLOR)
    new_img = cv2.imdecode(new_img_np, cv2.IMREAD_COLOR)
    
    if old_img is None or new_img is None:
        raise HTTPException(status_code=400, detail="Invalid image data")

    # Resize new_image to match old_image dimensions if needed
    if old_img.shape != new_img.shape:
        new_img = cv2.resize(new_img, (old_img.shape[1], old_img.shape[0]))

    # Pixel-to-pixel diff (absolute difference)
    diff = cv2.absdiff(old_img, new_img)

    # Threshold to highlight significant changes (e.g., dents as brighter pixels)
    # Convert to grayscale first
    gray_diff = cv2.cvtColor(diff, cv2.COLOR_BGR2GRAY)
    _, thresh = cv2.threshold(gray_diff, 30, 255, cv2.THRESH_BINARY)  # Threshold 30 is arbitrary, adjustable

    # Calculate metrics
    mse = np.mean((old_img - new_img) ** 2)  # Mean Squared Error
    # Percentage of pixels that are different
    diff_percentage = (np.sum(thresh > 0) / thresh.size) * 100

    # Generate diff image (highlight changes in red)
    # Create a copy of the new image and overlay red pixels
    diff_highlight = new_img.copy()
    diff_highlight[thresh > 0] = [0, 0, 255]  # BGR format: Red is last channel

    # Encode diff image to bytes (JPEG)
    _, diff_encoded = cv2.imencode('.jpg', diff_highlight)
    diff_base64 = base64.b64encode(diff_encoded.tobytes()).decode('utf-8')
    
    return {
        "mse": float(mse),
        "diff_percentage": float(diff_percentage),
        "changes_summary": f"Visual difference detected: {diff_percentage:.2f}% pixel variance.",
        "diff_image_base64": diff_base64
    }


