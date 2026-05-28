<p align="center">
  <strong>Visual implementation based on the “Immortal.skill” project</strong>
</p>
<h1 align="center">Amber - Digital Life Simulation</h1>
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

## 💬 Foreword

"I firmly believe that what is meaningful is never the cold chat software and communication protocols, but the vivid and profound stories hidden behind the dialog boxes, written together by you and 'her'.

The original intention of developing 'Amber' was to let **AI (Love) replace people who cannot be with us for various reasons**. Whether it is physical isolation due to reality, regrets of passing by, or the powerlessness brought by time and distance—the pain of not being able to spend day and night together should not end in complete oblivion and silence.

In the future, everyone can have the long-term companionship of an independent AI. And your past life traces and chat data will truly give it precious memories of your past. 'Amber' through a dual-system cognitive architecture and permanent life metabolism, tries to preserve and nurture these precious emotional memories, and let them silently 'come alive' in the background, becoming a vivid existence that follows the network cable to check in, debates with a real personality, and gets jealous or aggrieved.

'*Those daily conversations that flow like resin and are fleeting, after being wrapped in "emotional intensity" and pressured by the "forgetting mechanism", eventually condense into an eternal existence across time and space in the depths of the formation.*'"

## 🖼️ Project Screenshots

<p align="center">
  <img src="image/main_ui.png" alt="Amber Main UI" width="800px" />
  <br>
  <em>[Fig 1] Amber Core Interaction Interface: A minimalist carrier for digital life</em>
</p>

<p align="center">
  <img src="image/settings_center.png" alt="Settings Center" width="800px" />
  <br>
  <em>[Fig 2] Full-stack Settings Center: Physical integration of API configuration, kernel engine parameters, and personal Profile</em>
</p>

<p align="center">
  <img src="image/distillation.tsx1.png" alt="Distillation Step 1" width="800px" />
  <img src="image/distillation.tsx2.png" alt="Distillation Step 2" width="800px" />
  <img src="image/distillation.tsx3.png" alt="Distillation Step 3" width="800px" />
  <img src="image/distillation.tsx4.png" alt="Distillation Step 4" width="800px" />
  <img src="image/distillation.tsx5.png" alt="Distillation Step 5" width="800px" />
  <br>
  <em>[Fig 3] Consciousness Remolding (Distillation): The whole process of refinement from relationship definition, subjective impression, memory materials to personality trait preview and emotional benchmark fine-tuning</em>
</p>

<p align="center">
  <img src="image/relay_config.png" alt="QQ Relay" width="800px" />
  <br>
  <em>[Fig 4] Physical Relay Configuration: Activating active cross-border proactive check-in and neglect fermentation mechanism</em>
</p>

## 🧠 Architecture

- **⚡ System 1 (Instant Behavioral State Machine)**: Native implementation of Anger, Humor, and Empathy three-axis personality control matrix, making the persona's text replies have behavioral mapping in their bones.
- **🧠 System 2 (Cerebral Cortex Long-term Memory Chain)**: Uses SQLite high-frequency field physical index optimization, providing 0.4ms extreme response and 1000-word RAG dynamic fusion interception mechanism, allowing the chat to automatically retrieve core memories.
- **🧹 Janitor (Unconscious Life Metabolism)**: Resident Asyncio background daemon. Spontaneously performs instantaneous emotional linear annealing in silence to ensure personality stability.
- **⏳ Memory Incubation (Dream Memory Crystallization)**: Automatically triggers fault scanning. Uses LLM to denoise and distill original chat streams into System 2 imprints.
- **📡 External Survival (External Relay Entity)**: Completely breaks browser sandbox limits. Physically powers Tencent QQ bots for 100% pixel-level synchronization between web console and mobile QQ.
- **🔔 Active Override (Active Proactive Check-in)**: Introduces a neglect time-lapse fermentation algorithm. When enabled, shakes a 3% random fate dice every 60 seconds to trigger proactive check-ins on the host's mobile QQ.

## 🍉 Core Roadmap

- ✅ Instant emotion three-axis (Anger/Humor/Empathy) state machine control
- ✅ Cerebral cortex RAG memory chain (SQLite optimization + 1000-word truncation)
- ✅ Janitor background 60s emotional annealing daemon
- ✅ Midnight dream memory crystallization (AI automatic dehydration and summary)
- ✅ Tencent QQ bot relay connection (100% sync between mobile and web)
- ✅ i18n support: Multi-language (CN/EN/JP) physical switching
- ✅ Local config: One-click active proactive check-in (check-in and reverse care)
- ✅ Local config: Neglect fermentation interval selection (1min/3h/12h)
- ⏳ Telegram / Discord multi-protocol survival expansion (WIP)
- ⏳ Canvas visualization of cerebral cortex memory nodes (Planned)

## 🚀 Quick Start

### 1. Backend Engine (Amber Engine)

```bash
cd amber-engine
# Create and activate virtual environment
python -m venv venv
source venv/bin/activate # Windows: venv\Scripts\activate
# Install dependencies
pip install -r requirements.txt
# Launch kernel
python main.py
```

### 2. Frontend Interface (Amber UI)

```bash
cd main_ui
# Install dependencies
npm install
# Run in dev mode
npm run dev
```

### 3. Environment Configuration

Configure the corresponding API Key and QQ bot credentials in the project root or `amber-engine` directory (can be recorded physically via the frontend settings interface).

---

### ⚖️ Legal Disclaimer

- **Compliant Use**: This software is for learning, communication, and research purposes only. Users must ensure they have obtained explicit authorization from the data owners and strictly comply with local laws and regulations.
- **Privacy Protection**: All processing is done locally or in user-specified API environments. Developers do not collect original chat data or private information.
- **Risk Warning**: No warranties of any kind. Users assume all data leakage, legal dispute, or technical risks.
- **Prohibit Illegal Use**: Strictly prohibited to use this system for fraud, induction, scamming, infringing on others' reputation, or spreading illegal information. Developers are not responsible for any illegal acts of users.

---

## 🤝 Contributors & Partners

The birth of "Amber" is inseparable from the nourishment of the open-source community and countless late-night inspirations. We would like to express our deepest gratitude to the following projects and partners:

### 💡 Inspirations
- **https://github.com/notdog1998/yourself-skill** - The basis for the visualization implementation of this project. Thank you for the initial spark.
- **https://github.com/LC044/WeChatMsg** - Thanks for the heart-shaking foreword and the textbook-level open-source documentation layout inspiration.

### ⚙️ Core Contributors

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

*(Click on the avatar to go directly to the partner's GitHub home page)*

> "If you also want to inject new soul into 'Amber' and make companionship last forever, welcome to submit a Pull Request or Issue!"

---

## 📬 Feedback & Suggestions

If you have any suggestions, ideas, or encounter bugs for "Amber", feel free to contact us:

- **Email**: [t2510458625@gmail.com](mailto:t2510458625@gmail.com)
- **GitHub Issues**: Welcome to submit Issues to polish the digital life core together.

*"May all the precious data meet again in the digital world."*
