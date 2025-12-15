from sqlalchemy import create_engine, text
import os

# Get absolute path to db
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "nestfind.db") 
SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(SQLALCHEMY_DATABASE_URL)

def run_migration():
    with engine.connect() as connection:
        # Add enhanced feedback columns
        try:
            connection.execute(text("ALTER TABLE bookings ADD COLUMN buyer_interest VARCHAR"))
            print("Added buyer_interest column")
        except Exception as e:
            print(f"buyer_interest column might already exist: {e}")

        try:
            connection.execute(text("ALTER TABLE bookings ADD COLUMN buyer_timeline VARCHAR"))
            print("Added buyer_timeline column")
        except Exception as e:
            print(f"buyer_timeline column might already exist: {e}")

        try:
            connection.execute(text("ALTER TABLE bookings ADD COLUMN buyer_budget_feedback VARCHAR"))
            print("Added buyer_budget_feedback column")
        except Exception as e:
            print(f"buyer_budget_feedback column might already exist: {e}")

        try:
            connection.execute(text("ALTER TABLE bookings ADD COLUMN location_check_result VARCHAR"))
            print("Added location_check_result column")
        except Exception as e:
            print(f"location_check_result column might already exist: {e}")
            
    print("Migration complete!")

if __name__ == "__main__":
    run_migration()
