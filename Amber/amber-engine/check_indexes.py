import sqlite3
import os

db_path = 'd:/Project/Project Amber/Amber/Amber/amber-engine/data/amber_memory.db'

def check_indexes():
    if not os.path.exists(db_path):
        print(f"Database not found at {db_path}")
        return

    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    c.execute("SELECT name FROM sqlite_master WHERE type='index';")
    indexes = c.fetchall()
    print("Indexes:", indexes)
    
    # Check if specific indexes exist
    target_indexes = ['idx_messages_timestamp', 'idx_persona_corpus_content']
    existing_indexes = [idx[0] for idx in indexes]
    
    for target in target_indexes:
        if target in existing_indexes:
            print(f"Index {target} exists.")
        else:
            print(f"Index {target} MISSING.")
            
    conn.close()

if __name__ == "__main__":
    check_indexes()
