import sqlite3
import os

db_path = 'd:/Project/Project Amber/Amber/Amber/amber-engine/data/amber_memory.db'

def clear_truncated_data():
    if not os.path.exists(db_path):
        print(f"Database not found at {db_path}")
        return

    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    
    target = "[...内容过长已截断]"
    
    # Update messages table
    c.execute("UPDATE messages SET content = REPLACE(content, ?, '') WHERE content LIKE ?", (target, f"%{target}%"))
    msg_count = c.rowcount
    
    # Update persona_corpus table
    c.execute("UPDATE persona_corpus SET content = REPLACE(content, ?, '') WHERE content LIKE ?", (target, f"%{target}%"))
    corpus_count = c.rowcount
    
    conn.commit()
    conn.close()
    
    print(f"Successfully cleared '{target}' from database.")
    print(f"Messages updated: {msg_count}")
    print(f"Persona Corpus updated: {corpus_count}")

if __name__ == "__main__":
    clear_truncated_data()
