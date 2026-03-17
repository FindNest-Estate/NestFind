import asyncio
import asyncpg
import json
import os
from dotenv import load_dotenv
from typing import Dict, Any

load_dotenv()

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "nestfind_auth")
DB_USER = os.getenv("DB_USER", "nestfind_user")
DB_PASSWORD = os.getenv("DB_PASSWORD", "your_secure_password_here")

# PostgreSQL connection string
DB_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

async def extract_schema():
    conn = await asyncpg.connect(DB_URL)
    
    schema: Dict[str, Any] = {
        "tables": {},
        "enums": {},
        "views": []
    }
    
    # 1. Get Tables
    tables = await conn.fetch("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    """)
    
    for row in tables:
        table = row['table_name']
        schema["tables"][table] = {
            "columns": [],
            "foreign_keys": [],
            "indexes": [],
            "constraints": []
        }
        
        # Get Columns
        cols = await conn.fetch("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = $1
            ORDER BY ordinal_position
        """, table)
        
        for col in cols:
            schema["tables"][table]["columns"].append({
                "name": col['column_name'],
                "type": col['data_type'],
                "nullable": col['is_nullable'] == 'YES',
                "default": col['column_default']
            })
            
        # Get Foreign Keys
        fks = await conn.fetch("""
            SELECT
                kcu.column_name,
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name
            FROM 
                information_schema.table_constraints AS tc 
                JOIN information_schema.key_column_usage AS kcu
                  ON tc.constraint_name = kcu.constraint_name
                  AND tc.table_schema = kcu.table_schema
                JOIN information_schema.constraint_column_usage AS ccu
                  ON ccu.constraint_name = tc.constraint_name
                  AND ccu.table_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name=$1;
        """, table)
        for fk in fks:
            schema["tables"][table]["foreign_keys"].append({
                "column": fk['column_name'],
                "references_table": fk['foreign_table_name'],
                "references_column": fk['foreign_column_name']
            })
            
        # Get Constraints
        cons = await conn.fetch("""
            SELECT tc.constraint_name, tc.constraint_type, kcu.column_name
            FROM information_schema.table_constraints tc
            LEFT JOIN information_schema.key_column_usage kcu
              ON tc.constraint_name = kcu.constraint_name
            WHERE tc.table_name = $1
        """, table)
        for c in cons:
            schema["tables"][table]["constraints"].append({
                "name": c['constraint_name'],
                "type": c['constraint_type'],
                "column": c['column_name']
            })
            
        # Get Indexes
        idxs = await conn.fetch("""
            SELECT indexname, indexdef
            FROM pg_indexes
            WHERE tablename = $1
        """, table)
        for i in idxs:
            schema["tables"][table]["indexes"].append({
                "name": i['indexname'],
                "definition": i['indexdef']
            })
            
    # 2. Get ENUMs
    enums = await conn.fetch("""
        SELECT t.typname, e.enumlabel
        FROM pg_type t 
        JOIN pg_enum e ON t.oid = e.enumtypid  
        JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = 'public'
    """)
    for enum_row in enums:
        enum_name = enum_row['typname']
        enum_val = enum_row['enumlabel']
        if enum_name not in schema["enums"]:
            schema["enums"][enum_name] = []
        schema["enums"][enum_name].append(enum_val)

    # 3. Get Views
    views = await conn.fetch("""
        SELECT table_name 
        FROM information_schema.views 
        WHERE table_schema = 'public'
    """)
    schema["views"] = [r['table_name'] for r in views]
        
    await conn.close()
    
    with open("schema_dump.json", "w") as f:
        json.dump(schema, f, indent=2)

if __name__ == "__main__":
    asyncio.run(extract_schema())
