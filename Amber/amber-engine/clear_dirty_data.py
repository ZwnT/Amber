# Copyright 2025 ZwnT
# 
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
# 
#     http://www.apache.org/licenses/LICENSE-2.0
# 
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

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
