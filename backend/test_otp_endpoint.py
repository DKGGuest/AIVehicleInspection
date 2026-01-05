
import requests

def test_otp():
    try:
        print("Testing OTP Request...")
        response = requests.post("http://127.0.0.1:8000/auth/request-otp", data={"phone": "+1234567890"})
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            if "otp" in data:
                print(f"SUCCESS: Received OTP: {data['otp']}")
            else:
                print("FAILURE: 'otp' field missing in response")
        else:
            print("FAILURE: Non-200 status code")
            
    except Exception as e:
        print(f"ERROR: {str(e)}")

if __name__ == "__main__":
    test_otp()
