import sqlite3
import os

DB_PATH = os.path.join(os.getcwd(), "nestfind.db")

def log(msg, f):
    print(msg)
    f.write(msg + "\n")

def check_integrity():
    with open("integrity_result.txt", "w", encoding="utf-8") as f:
        log(f"Checking database at: {DB_PATH}", f)
        if not os.path.exists(DB_PATH):
            log("❌ Database file not found!", f)
            return

        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        issues_found = 0
        
        # 1. Check for NULL agent_id
        cursor.execute("SELECT count(*) FROM bookings WHERE agent_id IS NULL")
        null_agent_count = cursor.fetchone()[0]
        if null_agent_count > 0:
            log(f"❌ Found {null_agent_count} bookings with NULL agent_id", f)
            issues_found += 1
        else:
            log("✅ No bookings with NULL agent_id", f)
            
        # 2. Check for NULL property_id
        cursor.execute("SELECT count(*) FROM bookings WHERE property_id IS NULL")
        null_prop_count = cursor.fetchone()[0]
        if null_prop_count > 0:
            log(f"❌ Found {null_prop_count} bookings with NULL property_id", f)
            issues_found += 1
        else:
            log("✅ No bookings with NULL property_id", f)

        # 3. Check for NULL visit_date (if we want to enforce it for all)
        cursor.execute("SELECT count(*) FROM bookings WHERE visit_date IS NULL")
        null_date_count = cursor.fetchone()[0]
        if null_date_count > 0:
            log(f"⚠️ Found {null_date_count} bookings with NULL visit_date (Legacy records?)", f)
        else:
            log("✅ No bookings with NULL visit_date", f)

        # 4. Check for Orphan Bookings (Property doesn't exist)
        cursor.execute("""
            SELECT count(*) FROM bookings b 
            LEFT JOIN properties p ON b.property_id = p.id 
            WHERE p.id IS NULL
        """)
        orphan_prop_count = cursor.fetchone()[0]
        if orphan_prop_count > 0:
            log(f"❌ Found {orphan_prop_count} orphan bookings (property deleted)", f)
            issues_found += 1
        else:
            log("✅ No orphan bookings (property check)", f)
            
        # 5. Check for Invalid Statuses
        valid_statuses = ('PENDING', 'APPROVED', 'REJECTED', 'COUNTER_PROPOSED', 'COMPLETED', 'CANCELLED', 'EXPIRED')
        placeholders = ','.join(['?'] * len(valid_statuses))
        cursor.execute(f"SELECT count(*) FROM bookings WHERE status NOT IN ({placeholders})", valid_statuses)
        invalid_status_count = cursor.fetchone()[0]
        if invalid_status_count > 0:
            log(f"❌ Found {invalid_status_count} bookings with invalid status", f)
            issues_found += 1
        else:
            log("✅ All booking statuses are valid", f)

        conn.close()
        
        if issues_found == 0:
            log("\n🎉 Database integrity check PASSED!", f)
        else:
            log(f"\n⚠️ Database integrity check FAILED with {issues_found} issues.", f)

if __name__ == "__main__":
    check_integrity()
