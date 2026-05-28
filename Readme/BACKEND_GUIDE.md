# 后端部署指南 (Amber Engine)

<p align="center">
  <a href="ReadmeChinese.md">简体中文</a> | 
  <a href="ReadmeEnglish.md">English</a> | 
  <a href="ReadmeJapanese.md">日本語</a> | 
  <a href="QUICK_START.md">快速开始 (Quick Start)</a> | 
  <a href="BACKEND_GUIDE.md">后端指南 (Backend)</a> | 
  <a href="FRONTEND_GUIDE.md">前端指南 (Frontend)</a> | 
  <a href="QQBOT_GUIDE.md">QQ机器人指南 (QQBot)</a>
</p>

Amber Engine 是本项目的认知核心，基于 FastAPI 构建，负责情感计算、RAG 记忆检索及外部中继控制。

## ⚙️ 环境要求
- **Python**: 3.10 或更高版本
- **操作系统**: Windows (推荐) / Linux / macOS

## 🚀 启动步骤

### 1. 准备工作
进入后端根目录：
```bash
cd Amber/Amber/amber-engine
```

### 2. 虚拟环境 (强烈建议)
创建虚拟环境以物理隔离依赖：
```bash
python -m venv venv
```
激活虚拟环境：
- **Windows**: `.\venv\Scripts\activate`
- **Linux/macOS**: `source venv/bin/activate`

### 3. 安装依赖
```bash
pip install -r requirements.txt
```

### 4. 配置文件 (可选)
后端会自动在启动时创建 `amber.db` (SQLite)。
如果您需要修改默认端口或数据库路径，请查看 `config.py`。

### 5. 运行服务
```bash
python main.py
```
启动成功后，控制台会显示 `Uvicorn running on http://0.0.0.0:8000`。

## 📝 关键模块说明
- `main.py`: 核心 API 路由与 Janitor 守护进程逻辑。
- `database.py`: SQLAlchemy ORM 模型定义。
- `ingest_corpus.py`: 用于批量导入原始语料的工具脚本。
- `botpy.log`: QQ Bot 的运行日志，用于排查连接故障。

## ⚠️ 注意事项
- **API Key**: 本项目默认不包含 OpenAI API Key。启动后，请在前端的“全局 API 配置”中填入您自己的 Key，否则人格对话将无法生效。
- **数据库 Schema**: 如果您修改了代码中的模型，后端在启动时具备一定的自动补全能力，但重大变更建议删除 `amber.db` 重新生成。
