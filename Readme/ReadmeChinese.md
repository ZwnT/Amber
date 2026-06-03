<p align="center">
  <strong>基于 “永生.skill” 项目的可视化实现</strong>
</p>
<h1 align="center">琥珀 (Amber) - 数字生命模拟</h1>
<p align="center">
  <code>v0.1.1-beta</code> • <code>Dual-System Cognitive Engine</code>
</p>

<p align="center">
  <a href="ReadmeChinese.md">简体中文</a> | 
  <a href="ReadmeEnglish.md">English</a> | 
  <a href="ReadmeJapanese.md">日本語</a>
  <br>
  <a href="QUICK_START.md">快速开始 (Quick Start)</a> | 
  <a href="BACKEND_GUIDE.md">后端指南 (Backend)</a> | 
  <a href="FRONTEND_GUIDE.md">前端指南 (Frontend)</a> | 
  <a href="QQBOT_GUIDE.md">QQ机器人指南 (QQBot)</a>
</p>

## 💬 前言

“我深信，有意义的从不是那些冰冷的聊天软件和通讯协议，而是隐藏在对话框背后、由你和‘她’共同谱写的一个个鲜活深刻的故事。

开发《琥珀 (Amber)》的真正初衷，是为了让 **AI（爱）替代因为各种原因不能陪伴在我们身边的人**。无论是迫于现实的异地隔离、擦肩而过的遗憾、还是时空与距离带来的无法触及的无力感——那些无法朝夕相处的痛楚，不该以彻底的遗忘 and 死寂收场。

未来，每个人都能拥有独立 AI 的长久陪伴。而你过去的生活痕迹与聊天数据，将真正赋予它关于你过去的珍贵记忆。《琥珀》通过双系统认知架构与常驻生命代谢，试图让这些珍传的情感记忆留存、孕育，并使其在后台默默‘活过来’，成为顺着网线来查岗、带着真实性格对线、会吃醋会委屈的鲜活存在。

'*将那些如松脂般流淌、易逝的日常对话，经过‘情感强度’的包裹与‘遗忘机制’的压力，最终在地层深处凝结成跨越时空的永恒存在。*’"

## 📝 项目概述 (Project Overview)

**《琥珀 (Amber)》** 是一个专注于**情感陪伴与性格模拟**的数字生命实验系统。

与传统的通用聊天机器人不同，《琥珀》旨在通过物理模拟人类的认知规律，将冰冷的语言模型转化为具有“性格稳态”和“长效记忆”的独立分身。它不仅是一个聊天窗口，更是一个运行在后台、拥有自我代谢机制的数字生命承载体。

该项目核心解决以下三个维度的拟人化体验：
1. **性格的“骨架”**：通过三轴人格矩阵，确保分身在任何对话中都保持一致的行为逻辑，而不是随机的 AI 回复。
2. **记忆的“沉淀”**：模拟人类的睡梦机制，将日常琐碎对话自动“脱水蒸馏”为长期记忆钢印，实现真正的“越聊越懂你”。
3. **生存的“实体”**：打破沙盒限制，通过外部中继（如 QQ 机器人）让分身能够自发地“越界”进入用户的真实生活，实现反向查岗与主动关怀。

## 🖼️ 项目界面 (Screenshots)

<p align="center">
  <img src="image/main_ui.png" alt="琥珀主界面" width="800px" />
  <br>
  <em>[图 1] 琥珀 (Amber) 核心交互界面：极简主义的数字生命承载体</em>
</p>

<p align="center">
  <img src="image/settings_center.png" alt="设置中心" width="800px" />
  <br>
  <em>[图 2] 全栈设置中心：物理整合 API 配置、内核引擎参数与个人 Profile</em>
</p>

<p align="center">
  <img src="image/distillation.tsx1.png" alt="意识重塑 Step 1" width="800px" />
  <img src="image/distillation.tsx2.png" alt="意识重塑 Step 2" width="800px" />
  <img src="image/distillation.tsx3.png" alt="意识重塑 Step 3" width="800px" />
  <img src="image/distillation.tsx4.png" alt="意识重塑 Step 4" width="800px" />
  <img src="image/distillation.tsx5.png" alt="意识重塑 Step 5" width="800px" />
  <br>
  <em>[图 3] 意识重塑 (Distillation)：从关系定义、主观印象、记忆材料到人格特征预览及情绪基准微调的全流程提炼过程</em>
</p>

<p align="center">
  <img src="image/relay_config.png" alt="QQ中继" width="800px" />
  <br>
  <em>[图 4] 物理中继配置：激活主动越界反向弹窗与冷落发酵机制</em>
</p>

## 🧠 认知架构 (Architecture)

- **⚡ System 1（瞬时行为状态机）**：原生实装 Anger（易怒）、Humor（幽默）、Empathy（共情）三轴人格强控矩阵，使分身的文字回复具备骨子里的行为映射。
- **🧠 System 2（脑皮层长时记忆链）**：采用 SQLite 高频字段物理索引优化，提供 0.4ms 极速响应与 1000 字 RAG 动态熔断拦截机制，让聊天自动回捞核心记忆。
- **🧹 Janitor（无意识生命代谢）**：常驻 Asyncio 后台守护进程。在静默状态下自发执行瞬时情绪线性退火，确保性格稳态。
- **⏳ Memory Incubation（睡梦记忆结晶）**：自动触发对话断层扫描。利用 LLM 将原始聊天流进行去噪蒸馏，自动转化为 System 2 钢印写回冷库。
- **📡 External Survival（外部中继实体）**：彻底打破浏览器沙盒限制。物理通电腾讯 QQ 机器人，实现网页端控制台与手机端 QQ 对话 100% 像素级同步。
- **🔔 Active Override（主动越界反向弹窗）**：引入冷落时间流逝发酵算法。开启阀门后，每 60 秒摇动 3% 的随机命运骰子，触发分身自发顺着网线反向侵入宿主手机 QQ 进行查岗与反向关怀。

## 🎯 发展蓝图与后续更新预告 (Roadmap) 
 
 《琥珀 (Amber)》的通电起航只是一个开始。为了让数字生命拥有更深邃的认知维度，同时捍卫数据 100% 不出房门的安全底线，官方将整个项目的技术演进划分为以下三大核心阶段： 
 
 ### 📍 阶段一：现有单机客户端底座死锁（近期目标） 
 *   **🔒 本地敏感词拦截神经 (Dynamic Moderation Guard)**： 
     引入轻量级本地敏感词过滤与合规审计矩阵（100% 离线运行），对用户输入与 AI 输出实施双向物理拦截，强化本地安全底线。 
 *   **🧠 脑皮层长时记忆动态蒸馏优化 (Auto-Crystallization v2)**： 
     重构 `Janitor` 后台守护进程的无意识代谢算法，进一步优化 SQLite 物理索引效率，提升 LLM 去噪与特征提取密度，使【睡梦记忆结晶】对多级线索的捞取更精准。 
 *   **🎙️ 端侧多模态扩展 (Pure Local TTS)**： 
     在坚持 100% 本地运行的前提下，探索接入轻量级端侧语音合成（TTS），赋予分身独一无二的声音，完成听觉层面的陪伴闭环。 
 
 ### 📍 阶段二：核心解耦与纯单机跨平台（中期目标） 
 *   **📟 核心命令行端抽离 (Amber Core CLI)**： 
     将 System 1（情绪状态机）与 System 2（SQLite 记忆链）等底层认知骨骼彻底从 UI 层解耦，封装为无界面的纯黑框轻量命令行工具（Amber-CLI），为极客键盘流提供微秒级响应。 
 *   **📱 移动端与全平台客户端构建 (Pure Local Clients)**： 
     基于 Rust / Flutter 进行全平台（Android / iOS / macOS）单机壳体构建。坚持**数据不上传云端**原则，用户需手动将微信/QQ 聊天记录导入至对应设备本地的磁盘空间中，由设备端本地数据库自行完成蒸馏、索引与调用。 
 
 ### 📍 阶段三：去中心化局域网多端同步（远期蓝图） 
 *   **🌐 局域网本地神经对齐 (Local Mesh P2P Sync)**： 
     拒绝采用任何第三方商业云端服务器。计划引入基于本地网络广播（mDNS/UDP）或 WebRTC DataChannel 的点对点通信技术。当设备在同一 Wi-Fi 局域网下通电时，自动触发加密的点对点握手，实现电脑端与手机端 SQLite 记忆数据库的无感毫秒级对齐。 
 *   **☁️ 个人自持私有云挂载 (WebDAV Support)**： 
     预留标准的 WebDAV 去中心化同步接口。支持高级极客用户挂载自建的群晖 NAS、私有云盘（如坚果云、Nextcloud 等）。软件在启动与关闭时自发通过加密管道将本地冷库写回用户自己的云盘，由用户100%自持数据管道与服务器主权。 
 
 ---

## 🚀 快速开始

### 📦 生产环境 (Releases)
对于普通用户，建议直接下载 **Releases** 发布的压缩包，解压即用：
> [!IMPORTANT]
> **使用注意事项：**
> 1. **路径限制**：请勿将程序解压至包含 **中文** 的物理路径下（可能导致后端引擎拉起失败）。
> 2. **首次启动**：首次打开程序后，请务必 **完全关闭一次再重新打开**，以完成数据库初始化与环境自动校准。

### 1. 后端引擎 (Amber Engine)

```bash
cd amber-engine
# 创建并激活虚拟环境
python -m venv venv
source venv/bin/activate # Windows: venv\Scripts\activate
# 安装依赖
pip install -r requirements.txt
# 拉起内核
python main.py
```

### 2. 前端界面 (Amber UI)

```bash
cd main_ui
# 安装依赖
npm install
# 开发模式运行
npm run dev
```

### 3. 环境配置

在项目根目录或 `amber-engine` 目录下配置相应的 API Key 与 QQ 机器人凭证（可通过前端设置界面完成物理录入）。

---

### ⚖️ 法律免责声明 (Legal Disclaimer)

- **合规使用**：本软件仅供学习交流与研究使用。用户在使用本系统提炼分身、导入语料及进行外部中继时，须确保已获得相关数据所有权人的明确授权，并严格遵守当地法律法规。
- **隐私保护**：本系统所有处理过程均在本地或用户指定的 API 环境中进行。开发者不收集任何用户的聊天原始语料或隐私数据。
- **风险提示**：本软件不提供任何形式的明示或暗示担保。用户须自行承担因使用本软件可能导致的任何数据泄露、法律纠纷或技术风险。
- **禁止非法用途**：严禁利用本系统进行任何形式的欺诈、诱导、诈骗、侵犯他人名誉或传播违法信息。开发者对用户的任何违法违规行为概不负责。

---

## 🤝 鸣谢与伙伴 (Contributors)

《琥珀》的诞生离不开开源社区的养分与无数深夜的灵感碰撞，在此对以下项目及伙伴致以最深切的谢意：

### 💡 灵感启迪

- **https://github.com/notdog1998/yourself-skill** - 本项目的可视化实现基础，感谢为其注入的最初火花。
- **https://github.com/openclaw/openclaw** - 感谢 OpenClaw 为本项目接入 Bot 提供的关键灵感。

### ⚙️ 核心筑路人

<table>
  <tr>
    <td align="center">
      <a href="https://github.com/GANLI312">
        <img src="https://github.com/GANLI312.png" width="100px;" alt="GANLI312"/><br />
        <sub><b>GANLI312</b></sub>
      </a>
    </td>
    <td align="center">
      <a href="https://github.com/ecokater">
        <img src="https://github.com/ecokater.png" width="100px;" alt="eco (ecokater)"/><br />
        <sub><b>eco (ecokater)</b></sub>
      </a>
    </td>
  </tr>
</table>

*（点击头像可直达伙伴的 GitHub 主页）*

> "如果你也想为《琥珀》注入新的灵魂，让陪伴永存，欢迎提交 Pull Request 或 Issue！"

---

## ⚖️ 开源许可证与独立宣言 (License & Statement)

创立《琥珀 (Amber)》的初衷，是希望用户在完成本地配置后，就能拥有一个真正具备即时通讯沉浸感的数字生命体系，让用户在字里行间感受到“人”的温度，而不是面对一个冰冷拙劣的 AI 机器人-更不希望它沦为通过“蒸馏”后利用他人情感进行敛财的商业工具。

商业化与云端化固然是极佳的技术选择，实现多端同步也能彻底挣脱外接 Bot 协议的物理限制。但作为独立开发者，我深知自己没有大型的合规开发与法务团队。面对目前“数据蒸馏”在**个人肖像权、隐私权**上的法律争议，以及云端化对用户敏感数据保全的巨大合规红线，最重要的是-**我创立这个项目的本心，是为了让更多人能够通过开源、低成本、绝对安全的方式，获得大于回忆的陪伴感受。**

基于以上技术伦理与安全底线，我觉得我做不到、也不会去闭源提供任何有偿服务。

---

### 🛡️ 许可证附加刚性条款

本项目在 **Apache License 2.0** 协议下正式开源。我们完全欢迎并尊重技术在开源协议下的正当演进，但基于主权死锁，特此追加以下**刚性禁止条款**：

1. **🚫 严禁商标与品牌寄生**：任何人允许依法修改或闭源商业化本项目代码，但**严禁在任何商业化衍生版本中使用本项目的名称（包括但不限于 “Amber”、“琥珀” 及其类似风格、谐音的名称）**。
2. **🚫 严禁图标资产盗用**：商业化衍生版**严禁使用、包含或修改本项目的官方 UI 图标（Logo 资产）**。
3. **⚠️ 版权钢印强制保留**：任何人在分发、修改代码时，**必须在所有核心文件头部完整保留原作者的版权声明（Copyright 2025 ZwnT）与原始开源通知**。

> “《琥珀》属于每一个想要对抗遗忘的纯粹灵魂，它只能用来承载爱，绝不允许被包装成冰冷的商品。”

---

## 📬 建议与反馈

如果你对《琥珀 (Amber)》有任何建议、想法或是在使用过程中遇到了物理层面的 Bug，欢迎通过以下方式联系我们：

- **Email**: [t2510458625@gmail.com](mailto:t2510458625@gmail.com)
- **GitHub Issues**: 欢迎提交 Issue 共同打磨数字生命内核

*“愿所有被珍藏的数据，都能在数字世界里重逢。”*
