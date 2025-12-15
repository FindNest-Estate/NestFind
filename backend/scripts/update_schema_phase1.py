import sqlite3
import os
from datetime import datetime, timedelta

def update_schema():
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    DB_PATH = os.path.join(BASE_DIR, "nestfind.db")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    print(f"Connected to {DB_PATH}")

    # 1. Update bookings table
    columns_to_add = [
        ("approved_at", "DATETIME"),
        ("rejected_at", "DATETIME"),
        ("completed_at", "DATETIME"),
        ("cancelled_at", "DATETIME"),
        ("expiry_date", "DATETIME"),
        ("preferred_time_slots", "JSON"),
        ("agent_suggested_slot", "VARCHAR"),
        ("approved_slot", "VARCHAR"),
        ("buyer_message", "VARCHAR"),
        ("agent_notes", "VARCHAR"),
        ("cancellation_reason", "VARCHAR"),
        ("cancelled_by", "VARCHAR"),
        ("buyer_rating", "INTEGER"),
        ("buyer_feedback", "VARCHAR"),
        ("agent_rating", "INTEGER"),
        ("agent_feedback", "VARCHAR"),
        ("reminder_sent_at", "DATETIME"),
        ("last_status_changed_at", "DATETIME"),
        ("version", "INTEGER DEFAULT 1")
    ]

    print("Updating bookings table...")
    for col_name, col_type in columns_to_add:
        try:
            cursor.execute(f"ALTER TABLE bookings ADD COLUMN {col_name} {col_type}")
            print(f"  Added {col_name}")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e):
                print(f"  Skipped {col_name} (already exists)")
            else:
                print(f"  Error adding {col_name}: {e}")

    # Set default expiry_date for existing pending bookings (7 days from now)
    expiry = datetime.utcnow() + timedelta(days=7)
    cursor.execute("UPDATE bookings SET expiry_date = ? WHERE expiry_date IS NULL", (expiry,))
    
    # Set last_status_changed_at to created_at if null
    cursor.execute("UPDATE bookings SET last_status_changed_at = created_at WHERE last_status_changed_at IS NULL")

    # 2. Create notifications table
    print("Creating notifications table...")
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        triggered_by_id INTEGER,
        title VARCHAR(200) NOT NULL,
        message VARCHAR(1000) NOT NULL,
        action_url VARCHAR(500),
        notification_type VARCHAR(50) NOT NULL,
        priority VARCHAR(20) DEFAULT 'MEDIUM',
        channels JSON DEFAULT '["IN_APP"]',
        email_sent BOOLEAN DEFAULT 0,
        email_status VARCHAR(50),
        sms_sent BOOLEAN DEFAULT 0,
        sms_status VARCHAR(50),
        is_read BOOLEAN DEFAULT 0,
        read_at DATETIME,
        dismissed_at DATETIME,
        related_entity_id INTEGER NOT NULL,
        related_entity_type VARCHAR(50) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id),
        FOREIGN KEY(triggered_by_id) REFERENCES users(id)
    )
    """)
    
    # Indexes for notifications
    try:
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_notifications_user_type ON notifications(user_id, notification_type)")
    except Exception as e:
        print(f"Error creating notification indexes: {e}")

    # 3. Create visit_audit_logs table
    print("Creating visit_audit_logs table...")
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS visit_audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        visit_id INTEGER NOT NULL,
        action VARCHAR(100) NOT NULL,
        performed_by_id INTEGER NOT NULL,
        previous_status VARCHAR(20),
        new_status VARCHAR(20),
        details JSON,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(visit_id) REFERENCES bookings(id),
        FOREIGN KEY(performed_by_id) REFERENCES users(id)
    )
    """)
    
    try:
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_visit ON visit_audit_logs(visit_id)")
    except Exception as e:
        print(f"Error creating audit log index: {e}")

    conn.commit()
    conn.close()
    print("Schema update completed.")

if __name__ == "__main__":
    update_schema()
