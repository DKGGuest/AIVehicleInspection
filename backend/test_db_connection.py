import os
import mysql.connector
from dotenv import load_dotenv

# Re-load env just in case
load_dotenv()

print("Testing Azure Database Connection...")
HOST = os.getenv("DB_HOST", "ridesuredb.mysql.database.azure.com")
USER = os.getenv("DB_USER", "ridesuredb")
print(f"Connecting to: {HOST} as {USER}")

try:
    conn = mysql.connector.connect(
        host=HOST,
        user=USER,
        password=os.getenv("DB_PASSWORD"),
        database=os.getenv("DB_NAME"),
        port=int(os.getenv("DB_PORT", 3306)),
        ssl_ca=os.getenv("DB_SSL_CA")
    )
    
    if conn.is_connected():
        print("✅ SUCCESS: Connected to Azure MySQL Database!")
        # Try a simple query
        cursor = conn.cursor()
        cursor.execute("SELECT DATABASE();")
        db_name = cursor.fetchone()
        print(f"Current Database: {db_name[0]}")
        
        # Check tables
        cursor.execute("SHOW TABLES;")
        tables = cursor.fetchall()
        print("Tables found:", [t[0] for t in tables])
        
        cursor.close()
        conn.close()
    else:
        print("❌ FAILED: Connection object created but is_connected() is False.")

except mysql.connector.Error as err:
    print(f"❌ CONNECTION FAILED: {err}")
