import sqlite3
import os

db_path = 'd:/Project/Project Amber/Amber/Amber/amber-engine/data/amber.db'

def check_schema():
    if not os.path.exists(db_path):
        print(f"Database not found at {db_path}")
        return

    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    c.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = c.fetchall()
    print("Tables:", tables)
    
    for table in tables:
        t_name = table[0]
        c.execute(f"PRAGMA table_info({t_name});")
        print(f"Schema for {t_name}:", c.fetchall())
    
    conn.close()

if __name__ == "__main__":
    check_schema()
