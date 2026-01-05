import requests
import json

try:
    # Test Root
    print("Testing Root...")
    r = requests.get("http://127.0.0.1:8000/")
    print(f"Root Status: {r.status_code}")
    print(r.json())

    # Test Submission (Mock Data)
    print("\nTesting Submission...")
    payload = {
        "userId": "test-user",
        "carModel": "Camry",
        "photoIds": ["img1", "img2"]
    }
    r = requests.post("http://127.0.0.1:8000/submissions", json=payload)
    print(f"Submission Status: {r.status_code}")
    print(r.json())

    # Test Database via Demo Login
    print("\nTesting Database (Demo Login)...")
    r = requests.post("http://127.0.0.1:8000/auth/demo-login")
    print(f"Demo Login Status: {r.status_code}")
    print(r.json())


except Exception as e:
    print(f"Error: {e}")
