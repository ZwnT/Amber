import argparse
import json
import os
from sqlalchemy.orm import Session
from database import SessionLocal, Persona, PersonaCorpus

def chunk_conversation(messages, chunk_size=10, overlap=3):
    """
    将聊天记录切片为灵魂碎片 (滑动窗口)
    """
    chunks = []
    
    # 统一格式化为文本行
    lines = []
    for msg in messages:
        # 兼容多种常见的 JSON 导出格式 (如 OpenAI 格式, 微信导出格式等)
        if isinstance(msg, dict):
            sender = msg.get('role', msg.get('sender', msg.get('name', msg.get('author', 'Unknown'))))
            content = msg.get('content', msg.get('text', msg.get('msg', '')))
            if content and isinstance(content, str):
                lines.append(f"{sender}: {content.strip()}")
        elif isinstance(msg, str):
            # 如果直接是字符串列表
            lines.append(msg.strip())
            
    if not lines:
        return chunks

    # 滑动窗口切片，保证上下文连贯性
    step = max(1, chunk_size - overlap)
    for i in range(0, len(lines), step):
        chunk_lines = lines[i:i + chunk_size]
        if chunk_lines:
            chunks.append("\n".join(chunk_lines))
            
    return chunks

def ingest_json(file_path, persona_id, chunk_size=10, overlap=3):
    print(f"🌊 [1/4] 正在打开记忆阀门，读取文件: {file_path}")
    if not os.path.exists(file_path):
        print("❌ 错误: 文件不存在！")
        return

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except Exception as e:
        print(f"❌ 错误: JSON 解析失败: {e}")
        return

    if not isinstance(data, list):
        print("❌ 错误: JSON 根节点需要是一个列表 (例如: [{\"role\": \"user\", \"content\": \"...\"}, ...])")
        return

    print(f"🔪 [2/4] 正在将 {len(data)} 条聊天记录切碎为灵魂碎片 (窗口大小:{chunk_size}, 重叠:{overlap})...")
    chunks = chunk_conversation(data, chunk_size, overlap)
    print(f"🧩 [3/4] 共生成 {len(chunks)} 块灵魂碎片 (Chunks).")

    db: Session = SessionLocal()
    try:
        # 确认 Persona 存在
        persona = db.query(Persona).filter(Persona.id == persona_id).first()
        if not persona:
            print(f"❌ 错误: 找不到 ID 为 '{persona_id}' 的分身！")
            print("💡 提示: 请先在前端页面创建一个分身，并使用它的 ID。")
            return

        # 写入数据库
        print("💾 [4/4] 正在注入 PersonaCorpus 数据库大坝...")
        inserted_count = 0
        for chunk in chunks:
            if chunk.strip():
                # 通过外部工具导入的历史数据也视为固化记忆，免疫 Janitor
                db_corpus = PersonaCorpus(persona_id=persona_id, content=chunk.strip(), is_pinned=True)
                db.add(db_corpus)
                inserted_count += 1
        
        db.commit()
        print(f"\n✅ 注入完成！成功向分身 '{persona.name}' 注入 {inserted_count} 块灵魂碎片！")
        print("🛡️ “有据可查、无据敷衍” 零幻觉事实防御盾牌已满级充能！")
    except Exception as e:
        db.rollback()
        print(f"❌ 错误: 数据库注入失败: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="将 .json 聊天历史切片并注入冷记忆库 (PersonaCorpus)")
    parser.add_argument("file", help=".json 聊天记录文件路径")
    parser.add_argument("persona_id", help="目标分身 (Persona) 的 ID (可以在前端 URL 或数据库中找到)")
    parser.add_argument("--chunk-size", type=int, default=10, help="每个碎片的对话行数 (默认 10)")
    parser.add_argument("--overlap", type=int, default=3, help="碎片间的重叠行数 (默认 3)")
    
    args = parser.parse_args()
    ingest_json(args.file, args.persona_id, args.chunk_size, args.overlap)
