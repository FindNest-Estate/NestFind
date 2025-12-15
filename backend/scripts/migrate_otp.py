import sqlite3

def migrate():
    conn = sqlite3.connect('nestfind.db')
    cursor = conn.cursor()
    
    try:
        cursor.execute("ALTER TABLE bookings ADD COLUMN visit_otp VARCHAR")
        print("Added visit_otp column")
    except Exception as e:
        print(f"visit_otp error: {e}")

    try:
        cursor.execute("ALTER TABLE bookings ADD COLUMN visit_otp_expires_at DATETIME")
        print("Added visit_otp_expires_at column")
    except Exception as e:
        print(f"visit_otp_expires_at error: {e}")

    conn.commit()
    conn.close()

if __name__ == "__main__":
    migrate()
