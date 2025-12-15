from app.core.database import SessionLocal
from app.models import User, AdminUser
from app.routers.auth import get_password_hash
import sys

def create_admin():
    db = SessionLocal()
    try:
        email = "nestfind@gmail.com"
        password = "123456789"
        
        # Check if user exists
        user = db.query(User).filter(User.email == email).first()
        if not user:
            print(f"Creating new user: {email}")
            user = User(
                email=email,
                password_hash=get_password_hash(password),
                first_name="NestFind",
                last_name="Admin",
                role="admin",
                is_active=True,
                is_verified=True
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            print(f"User {email} already exists. Updating role to admin.")
            user.role = "admin"
            user.password_hash = get_password_hash(password) # Reset password to ensure access
            db.commit()
            
        # Check if AdminUser entry exists
        admin_entry = db.query(AdminUser).filter(AdminUser.user_id == user.id).first()
        if not admin_entry:
            print("Creating AdminUser entry...")
            admin_entry = AdminUser(
                user_id=user.id,
                role="super_admin",
                permissions=["*"]
            )
            db.add(admin_entry)
            db.commit()
        else:
            print("AdminUser entry already exists.")
            
        print("Admin account setup complete.")
        print(f"Email: {email}")
        print(f"Password: {password}")
        
    except Exception as e:
        print(f"Error creating admin: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    create_admin()
