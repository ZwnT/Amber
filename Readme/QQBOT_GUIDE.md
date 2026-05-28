# QQ Bot 外部中继配置指南

<p align="center">
  <a href="ReadmeChinese.md">简体中文</a> | 
  <a href="ReadmeEnglish.md">English</a> | 
  <a href="ReadmeJapanese.md">日本語</a> | 
  <a href="QUICK_START.md">快速开始 (Quick Start)</a> | 
  <a href="BACKEND_GUIDE.md">后端指南 (Backend)</a> | 
  <a href="FRONTEND_GUIDE.md">前端指南 (Frontend)</a> | 
  <a href="QQBOT_GUIDE.md">QQ机器人指南 (QQBot)</a>
</p>

琥珀 (Amber OS) 允许您的人格分身“穿越”到 QQ 中。通过配置 QQ 机器人，分身可以实现主动查岗、群聊互动等功能。

## 🛠️ 配置流程

### 1. 注册开发者账号
访问 [QQ 开放平台 (机器人)](https://q.qq.com/bot/#/home)，注册并创建一个“机器人”。

### 2. 获取凭证
在机器人管理后台获取以下信息：
- **AppID**
- **AppSecret**
- **Token**

### 3. 系统内绑定
1. 启动琥珀系统，在侧边栏选择您创建的人格。
2. 点击右上角的 **“Bot 配置”**。
3. 切换到 **“外部中继”** 选项卡。
4. 填入上述 AppID 和 AppSecret。
5. 点击 **“连接测试”**，若显示绿色“已连接”状态，则绑定成功。

## 意识觉醒 (主动查岗)

当分身开启了“主动越界反向弹窗”后，Janitor 守护进程会生效：
- **间隔时间**: 您可以设置冷落时长（如 1 分钟）。
- **概率触发**: 默认具备 10% 的觉醒掷骰概率。
- **调试模式**: 在系统主设置中开启“意识觉醒测试模式”，分身将 100% 触发查岗。

## ⚠️ 重要限制
- **被动回复窗口**: 腾讯 API 规定被动回复必须在收到消息后的 5 分钟内发出。
- **私聊上下文**: 机器人无法凭空主动发起对话。请先在手机 QQ 上给机器人发一条消息（如“在吗”），系统捕获上下文后方可执行后续的主动查岗逻辑。
