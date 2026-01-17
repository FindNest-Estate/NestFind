@echo off
REM NestFind Database Setup Script
REM This creates the database and runs all migrations in order

echo Creating nestfind database...
psql -U postgres -f setup_db.sql

echo.
echo Running migrations...
echo.

echo [1/10] Auth schema...
psql -U postgres -d nestfind -f migrations/001_auth_schema.sql

echo [2/10] Registration fields...
psql -U postgres -d nestfind -f migrations/002_registration_fields.sql

echo [3/10] Property schema...
psql -U postgres -d nestfind -f migrations/003_property_schema.sql

echo [4/10] State and pincode...
psql -U postgres -d nestfind -f migrations/004_add_state_pincode.sql

echo [5/10] Property verification update...
psql -U postgres -d nestfind -f migrations/004_property_verification_update.sql

echo [6/10] Messaging and notifications...
psql -U postgres -d nestfind -f migrations/005_messaging_notifications.sql

echo [7/10] Saved properties (NEW)...
psql -U postgres -d nestfind -f migrations/005_saved_properties.sql

echo [8/10] Visit and offer schema...
psql -U postgres -d nestfind -f migrations/006_visit_offer_schema.sql

echo [9/10] Reservation schema...
psql -U postgres -d nestfind -f migrations/007_reservation_schema.sql

echo [10/10] Transaction schema...
psql -U postgres -d nestfind -f migrations/008_transaction_schema.sql

echo [11/10] Dispute and audit schema...
psql -U postgres -d nestfind -f migrations/009_dispute_audit_schema.sql

echo.
echo ================================
echo Database setup complete!
echo ================================
