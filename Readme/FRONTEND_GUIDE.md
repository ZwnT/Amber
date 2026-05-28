# 前端部署指南 (Amber UI)

<p align="center">
  <a href="ReadmeChinese.md">简体中文</a> | 
  <a href="ReadmeEnglish.md">English</a> | 
  <a href="ReadmeJapanese.md">日本語</a> | 
  <a href="QUICK_START.md">快速开始 (Quick Start)</a> | 
  <a href="BACKEND_GUIDE.md">后端指南 (Backend)</a> | 
  <a href="FRONTEND_GUIDE.md">前端指南 (Frontend)</a> | 
  <a href="QQBOT_GUIDE.md">QQ机器人指南 (QQBot)</a>
</p>

Amber UI 是本系统的交互层，基于 Next.js 14 构建，提供了沉浸式的数字生命管理体验。

## ⚙️ 环境要求
- **Node.js**: 18.17.0 或更高版本
- **npm**: 9.x 或更高版本

## 🚀 启动步骤

### 1. 准备工作
进入前端根目录：
```bash
cd Amber/Amber/main_ui
```

### 2. 安装依赖
```bash
npm install
```
*注意：如果安装速度慢，建议使用镜像源或执行 `npm i --legacy-peer-deps`。*

### 3. 环境变量
本项目前端默认指向 `http://localhost:8000` (后端默认地址)。
若需修改后端连接地址，请在相关组件中搜索 `API_BASE_URL` 进行调整。

### 4. 运行开发服务器
```bash
npm run dev
```
启动成功后，请访问 [http://localhost:3000](http://localhost:3000)。

## 🎨 视觉说明
- **Logo**: 位于 `public/logo.png`，您可以自行替换。
- **主题**: 系统支持响应式布局，完美适配不同尺寸的显示器。
- **交互**: 侧边栏集成了“提炼向导”、“实时聊天”、“数据监控”与“系统设置”。

## 🛠️ 故障排查
- **Failed to fetch**: 这种报错通常是因为后端 Python 服务未启动，或端口被占用。请确保后端已成功运行在 8000 端口。
- **Key 重复报错**: 若控制台出现 React Key 重复提示，请刷新页面。这是由于本地缓存与轮询同步瞬时冲突导致的，不影响功能使用。
