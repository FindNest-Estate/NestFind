from sqlalchemy import create_engine, text
import os

# Database URL
DATABASE_URL = "sqlite:///D:/NestFind/backend/nestfind.db"

def migrate():
    engine = create_engine(DATABASE_URL)
    with engine.connect() as connection:
        try:
            # Check if column exists
            result = connection.execute(text("PRAGMA table_info(users)"))
            columns = [row[1] for row in result]
            
            if "notification_preferences" not in columns:
                print("Adding notification_preferences column to users table...")
                # Add column
                connection.execute(text("ALTER TABLE users ADD COLUMN notification_preferences JSON DEFAULT '{}'"))
                print("Column added successfully.")
            else:
                print("Column notification_preferences already exists.")
                
        except Exception as e:
            print(f"An error occurred: {e}")

if __name__ == "__main__":
    migrate()
