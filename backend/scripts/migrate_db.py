import sqlite3
import os

DB_PATH = "backend/nestfind.db"

def migrate():
    print(f"Migrating database at {DB_PATH}...")
    
    if not os.path.exists(DB_PATH):
        print(f"Database file {DB_PATH} not found!")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # List of columns to add
    columns_to_add = [
        ("latitude", "FLOAT"),
        ("longitude", "FLOAT"),
        ("service_radius", "INTEGER DEFAULT 50"),
        ("commission_rate", "FLOAT DEFAULT 2.0"),
        ("is_available", "BOOLEAN DEFAULT 1")
    ]

    for col_name, col_type in columns_to_add:
        try:
            print(f"Adding column {col_name}...")
            cursor.execute(f"ALTER TABLE users ADD COLUMN {col_name} {col_type}")
            print(f"Column {col_name} added successfully.")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e):
                print(f"Column {col_name} already exists. Skipping.")
            else:
                print(f"Error adding column {col_name}: {e}")

    conn.commit()
    conn.close()
    print("Migration complete.")

if __name__ == "__main__":
    migrate()
