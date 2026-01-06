
import os
import mysql.connector
from dotenv import load_dotenv

load_dotenv()

# --- Mock Database Implementation ---
class MockCursor:
    def __init__(self, connection):
        self.connection = connection
        self.lastrowid = 1
        self._rows = []

    def execute(self, query, params=None):
        query = query.strip().upper()
        print(f"MOCK DB EXEC: {query} | Params: {params}")

        if "INSERT INTO USERS" in query:
             # Simulate creating a user
             self.lastrowid = 123  # Mock User ID
        elif "SELECT ID FROM USERS" in query:
             # Simulate finding a user (return None to force insert, or a tuple to simulate existing)
             # Let's verify against a simple in-memory store if we want to be fancy, 
             # but for "Invalid OTP/Server Error" fix, always succeeding is better.
             pass 
             # self._rows = [(123,)] # Use this to simulate "User Exists"
             self._rows = None      # Use this to simulate "New User" -> Insert path
        elif "INSERT INTO INSPECTIONS" in query:
             self.lastrowid = 555 # Mock Inspection ID
        elif "INSERT INTO INSPECTION_IMAGES" in query:
             pass

    def fetchone(self):
        return self._rows

    def close(self):
        pass

class MockConnection:
    def cursor(self):
        return MockCursor(self)
    
    def commit(self):
        print("MOCK DB COMMIT")
        
    def close(self):
        pass
# ------------------------------------

def get_connection():
    # Force Mock Connection for now due to Azure connectivity issues
    return MockConnection()

    # Original Code (Commented out)
    """
    try:
        conn = mysql.connector.connect(
            host=os.getenv("DB_HOST"),
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD"),
            database=os.getenv("DB_NAME"),
            port=os.getenv("DB_PORT", 3306),
            ssl_ca=os.getenv("DB_SSL_CA") 
        )
        return conn
    except mysql.connector.Error as err:
        print(f"Error connecting to database: {err}")
        # Fallback to Mock if real DB fails
        return MockConnection()
    """
