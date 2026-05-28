# 琥珀 (Amber) 快速上手指南 ⚡

<p align="center">
  <a href="ReadmeChinese.md">简体中文</a> | 
  <a href="ReadmeEnglish.md">English</a> | 
  <a href="ReadmeJapanese.md">日本語</a> | 
  <a href="QUICK_START.md">快速开始 (Quick Start)</a> | 
  <a href="BACKEND_GUIDE.md">后端指南 (Backend)</a> | 
  <a href="FRONTEND_GUIDE.md">前端指南 (Frontend)</a> | 
  <a href="QQBOT_GUIDE.md">QQ机器人指南 (QQBot)</a>
</p>

欢迎来到数字生命的世界！这份指南将帮助您在 3 分钟内完成系统部署并开始与您的第一个数字人格互动。

## 🛠️ 第一步：一键环境准备

### 1. 后端 (Python)

```bash
# 进入目录
cd Amber/Amber/amber-engine

# 创建虚拟环境
python -m venv venv
.\venv\Scripts\activate

# 安装核心依赖
pip install -r requirements.txt

# 启动引擎
python main.py
```

### 2. 前端 (Node.js)

```bash
# 新开一个终端，进入目录
cd Amber/Amber/main_ui

# 安装依赖并启动
npm install
npm run dev
```

---

## 🎭 第二步：提炼您的第一个人格

1. 访问 `http://localhost:3000`。
2. 点击左侧导航栏的 **“+” (提炼向导)**。
3. **上传语料**：将您想要 AI 模仿的对话记录（.txt）上传。
4. **结晶预览**：系统会自动分析语料并生成性格特质、口头禅等。
5. **固化保存**：确认配置无误后点击“固化”，分身即刻觉醒。

---

## 🌐 第三步：跨端交互 (QQ 同步)

想要在手机上也能和她聊天？

1. 在侧边栏选中分身，点击右上角 **“Bot 配置”**。
2. 在 **“外部中继”** 中填入您的 QQ 机器人 AppID。
3. 点击 **“连接测试”**。
4. **激活主动性**：开启“主动越界反向弹窗”，设置间隔为 1 分钟。
5. **强制觉醒**：在左下角设置中开启“测试模式”，她会立刻在 QQ 上找你！

---

## 💡 玩转技巧

- **钢印记忆**：在聊天框输入“记住：XXX”，这句话将永久刻入她的核心记忆。
- **情感波动**：观察顶部的状态栏，她的喜怒哀乐会随你的话语实时起伏。
- **记忆代谢**：Janitor 守护进程每分钟都在运行，帮她过滤无用的废话。

> **遇到问题？** 请参阅同目录下的 `BACKEND_GUIDE.md` 和 `FRONTEND_GUIDE.md` 获取详细说明。
