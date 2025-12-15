import sqlite3
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_FILE = os.path.join(BASE_DIR, "nestfind.db")

def upgrade_db():
    if not os.path.exists(DB_FILE):
        print(f"Database {DB_FILE} not found. Skipping upgrade.")
        return

    print(f"Connecting to {DB_FILE}...")
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()

    # 1. Add registration_date to offers
    try:
        cursor.execute("ALTER TABLE offers ADD COLUMN registration_date DATETIME")
        print("Added registration_date to offers")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e):
            print("registration_date already exists in offers")
        else:
            print(f"Error adding registration_date: {e}")

    # 2. Add uploaded_by_id to deal_payments
    # First check if table exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='deal_payments'")
    if cursor.fetchone():
        try:
            cursor.execute("ALTER TABLE deal_payments ADD COLUMN uploaded_by_id INTEGER REFERENCES users(id)")
            print("Added uploaded_by_id to deal_payments")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e):
                print("uploaded_by_id already exists in deal_payments")
            else:
                print(f"Error adding uploaded_by_id: {e}")
    else:
        print("deal_payments table does not exist yet. It will be created by the app.")

    conn.commit()
    conn.close()

if __name__ == "__main__":
    upgrade_db()
