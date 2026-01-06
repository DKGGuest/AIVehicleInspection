import requests
import os

# Configuration
BASE_URL = "http://127.0.0.1:8000"
UPLOAD_URL = f"{BASE_URL}/upload"
FILE_TYPE = "others"
TEST_FILE_NAME = "test_upload_image.txt"
TEST_FILE_CONTENT = b"This is a test file for local upload."

def test_local_upload():
    print(f"Testing upload to {UPLOAD_URL}...")

    # 1. Create a dummy file
    with open(TEST_FILE_NAME, "wb") as f:
        f.write(TEST_FILE_CONTENT)

    try:
        # 2. Upload the file
        with open(TEST_FILE_NAME, "rb") as f:
            files = {"file": (TEST_FILE_NAME, f, "text/plain")}
            data = {"fileType": FILE_TYPE}
            
            response = requests.post(UPLOAD_URL, files=files, data=data)

        # 3. Check Response
        print(f"Response Status Code: {response.status_code}")
        print(f"Response Body: {response.text}")

        if response.status_code == 201:
            json_resp = response.json()
            file_name = json_resp["data"]["fileName"]
            file_url = json_resp["data"]["url"]
            
            print("\n✅ Upload Endpoint Success!")
            print(f"Returned Filename: {file_name}")
            print(f"Returned URL: {file_url}")

            # 4. Verify Local File Existence
            # Expected path: backend/backend/files/others/<timestamp>_test_upload_image.txt
            # We need to construct the absolute path to verify.
            # Assuming this script is run from e:\taxi\backend\backend
            current_dir = os.getcwd()
            files_dir = os.path.join(current_dir, "files", FILE_TYPE)
            saved_file_path = os.path.join(files_dir, file_name)

            print(f"\nVerifying file existence at: {saved_file_path}")
            
            if os.path.exists(saved_file_path):
                print("✅ File successfully found on local disk!")
            else:
                print("❌ File NOT found on local disk.")

        else:
            print("❌ Upload Failed.")

    except Exception as e:
        print(f"❌ An error occurred: {e}")

    finally:
        # Cleanup dummy file
        if os.path.exists(TEST_FILE_NAME):
            os.remove(TEST_FILE_NAME)

if __name__ == "__main__":
    test_local_upload()
