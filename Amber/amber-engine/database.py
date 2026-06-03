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

import os
from sqlalchemy import create_engine, Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey, inspect
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from datetime import datetime
from config import DATABASE_URL

# 初始化数据库引擎
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class Persona(Base):
    __tablename__ = "personas"
    
    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    gender = Column(String)
    relationship_desc = Column(String)  # 避免与 SQLAlchemy 的 relationship 命名冲突
    impression = Column(Text)
    avatar = Column(Text, nullable=True)  # 头像 Base64 数据
    token = Column(String, nullable=True) # Bot Token
    core_memory = Column(Text)
    traits = Column(Text)          # 存储 JSON 字符串
    catchphrases = Column(Text)    # 存储 JSON 字符串
    
    # 档案技术指标
    stability = Column(Float, default=85.0)
    synchronization = Column(Float, default=90.0)
    
    # 白皮书核心：情绪指标 (动态状态机基准)
    happiness = Column(Float, default=50.0)
    anger = Column(Float, default=0.0)
    anxiety = Column(Float, default=0.0)

    # --- 战线二：主动越界反向弹窗控制 ---
    is_override_active = Column(Boolean, default=False, server_default="0")
    override_interval = Column(Integer, default=180, server_default="180")
    last_interaction_time = Column(DateTime, default=datetime.utcnow)
    last_relay_context = Column(Text, nullable=True) # 存储 JSON 字符串
    bot_app_id = Column(String, nullable=True)
    bot_app_secret = Column(String, nullable=True)
    bot_token = Column(String, nullable=True)
    last_incubation_time = Column(DateTime, default=datetime.utcnow) # 睡梦结晶指针
 
    # 关联消息记录
    messages = relationship("Message", back_populates="persona", cascade="all, delete-orphan")
    
    # 关联冷记忆语料库
    corpus = relationship("PersonaCorpus", back_populates="persona", cascade="all, delete-orphan")

class Message(Base):
    __tablename__ = "messages"
    
    id = Column(Integer, primary_key=True, index=True)
    persona_id = Column(String, ForeignKey("personas.id"), index=True)
    role = Column(String, nullable=False)  # user, assistant, system
    content = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    
    # 白皮书核心：System 2 过滤标记
    is_filtered = Column(Boolean, default=False)
    
    # Phase 5.5: Janitor 代谢机制字段
    weight = Column(Float, default=1.0, server_default="1.0", nullable=False)
    is_pinned = Column(Boolean, default=False, server_default="0", nullable=False)

    # 关联分身
    persona = relationship("Persona", back_populates="messages")

class PersonaCorpus(Base):
    __tablename__ = "persona_corpus"
    
    id = Column(Integer, primary_key=True, index=True)
    persona_id = Column(String, ForeignKey("personas.id"), index=True)
    content = Column(Text, nullable=False, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    # Phase 5.5: Janitor 代谢机制字段
    weight = Column(Float, default=1.0, server_default="1.0", nullable=False)
    is_pinned = Column(Boolean, default=False, server_default="0", nullable=False)
    
    # 关联分身
    persona = relationship("Persona", back_populates="corpus")

# 检查是否需要硬核刷洗重建（若旧版缺少 weight 字段）
inspector = inspect(engine)
if inspector.has_table("personas"):
    columns = [col['name'] for col in inspector.get_columns("personas")]
    if "is_override_active" not in columns:
        print("⚠️ 检测到旧版数据库结构缺失 'is_override_active' 字段，执行彻底刷洗...")
        Base.metadata.drop_all(bind=engine)

if inspector.has_table("messages"):
    columns = [col['name'] for col in inspector.get_columns("messages")]
    if "weight" not in columns:
        print("⚠️ 检测到旧版数据库结构缺失 'weight' 字段，为避免拉取崩溃，正在执行彻底刷洗（重建数据库）...")
        Base.metadata.drop_all(bind=engine)

# 自动创建所有表
Base.metadata.create_all(bind=engine)
