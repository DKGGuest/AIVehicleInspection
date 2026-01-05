
import mysql.connector
import sys

def test_login(host, user, password):
    print(f"Testing {user}@{host} with password '{password}'...")
    try:
        conn = mysql.connector.connect(
            host=host,
            user=user,
            password=password,
            port=3306,
            connection_timeout=5
        )
        print(f"✅ SUCCESS connecting to {host}")
        conn.close()
        return True
    except mysql.connector.Error as err:
        print(f"❌ FAILED: {err}")
        return False

password = "Vinod123"

# Test 1: localhost
t1 = test_login("localhost", "root", password)

# Test 2: 127.0.0.1
t2 = test_login("127.0.0.1", "root", password)

# Test 3: ::1 (IPv6 localhost)
# t3 = test_login("::1", "root", password)

if not (t1 or t2):
    print("\nCould not connect with provided credentials.")
