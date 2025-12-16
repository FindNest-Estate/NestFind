import sqlite3

def update_schema():
    # Connect to the database in the backend directory
    import os
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    DB_PATH = os.path.join(BASE_DIR, "nestfind.db")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Add columns to offers table
    try:
        cursor.execute("ALTER TABLE offers ADD COLUMN acceptance_letter_url TEXT")
        print("Successfully added 'acceptance_letter_url' to 'offers'.")
    except sqlite3.OperationalError:
        print("'acceptance_letter_url' already exists in 'offers'.")

    try:
        cursor.execute("ALTER TABLE offers ADD COLUMN receipt_url TEXT")
        print("Successfully added 'receipt_url' to 'offers'.")
    except sqlite3.OperationalError:
        print("'receipt_url' already exists in 'offers'.")

    # Add columns to properties table (if needed, but status is already there, just enum change which SQLite doesn't strictly enforce)
    # SQLite is loose with types, so 'reserved' status is fine without schema change if it's just a string column.
    
    # Add receipt_path to transactions table
    try:
        cursor.execute("ALTER TABLE transactions ADD COLUMN receipt_path VARCHAR")
        print("Successfully added 'receipt_path' to 'transactions'.")
    except sqlite3.OperationalError:
        print("'receipt_path' already exists in 'transactions'.")

    # Add columns to users table (Find Agent features)
    user_columns = [
        ("latitude", "FLOAT"),
        ("longitude", "FLOAT"),
        ("service_radius", "INTEGER DEFAULT 50"),
        ("service_areas", "TEXT DEFAULT ''"),
        ("commission_rate", "FLOAT DEFAULT 2.0"),
        ("is_available", "BOOLEAN DEFAULT 1")
    ]

    for col_name, col_type in user_columns:
        try:
            cursor.execute(f"ALTER TABLE users ADD COLUMN {col_name} {col_type}")
            print(f"Successfully added '{col_name}' to 'users'.")
        except sqlite3.OperationalError:
            print(f"'{col_name}' already exists in 'users'.")

    conn.commit()
    conn.close()

if __name__ == "__main__":
    update_schema()
