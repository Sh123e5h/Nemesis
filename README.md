<div align="center">

  <img src="public/favicon-512.png" alt="Nemesis Logo" width="200" />

  <h1>NEMESIS</h1>
  <p><strong>Intelligence Protocol Activated</strong></p>

  <p>
    The most advanced academic collaboration and productivity platform,<br/>
    engineered for students who refuse to be ordinary.
  </p>

  <p>
    <img src="https://img.shields.io/badge/Node.js-24.x-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
    <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
    <img src="https://img.shields.io/badge/Vite-5-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
    <img src="https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
    <img src="https://img.shields.io/badge/Capacitor-119EFF?style=for-the-badge&logo=capacitor&logoColor=white" alt="Capacitor" />
    <img src="https://img.shields.io/github/actions/workflow/status/Sh123e5h/Nemesis/ci.yml?style=for-the-badge&label=CI&logo=githubactions&logoColor=white" alt="CI" />
  </p>

  <p>
    <a href="https://nemesiss.in"><strong>🚀 Live Demo</strong></a>
    ·
    <a href="./Nemesis_Official_Documentation.pdf"><strong>📖 Full Documentation</strong></a>
    ·
    <a href="https://github.com/Sh123e5h/Nemesis/issues"><strong>🐛 Report Bug</strong></a>
  </p>

</div>

---

## 🧠 About Nemesis

**Nemesis** was born from a simple belief: students deserve tools that match their ambition. Named after the Greek goddess of retribution — the force that restores balance — Nemesis is the academic equalizer that arms every student with enterprise-grade productivity.

Built from the ground up by **Lead Architect Shireesh Kashyap**, a 19-year-old CSE student at Pranveer Singh Institute of Technology, Kanpur, this platform brings together years of Linux expertise, cybersecurity know-how, and a passion for building things that *actually matter*.

> *"Nemesis is like sex, it's better when it's free."*

---

## ✨ Core Features

### 📊 01. Dashboard
Your mission control. Monitor upcoming tasks, recent activity, group updates, and your gamification progress — all from a single, beautiful hub.

<div align="center">
<img src="public/showcase/dashboard.png" alt="Nemesis Dashboard" width="100%" />
</div>

### 🗂️ 02. Study Organizer
Organize subjects and topics with folders, tags, and smart search. Upload files, save links, generate AI quizzes, and share materials with groups — all in one place.

<div align="center">
<img src="public/showcase/organizer.png" alt="Nemesis Dashboard" width="100%" />
</div>

### 👥 03. Groups
Real-time collaboration spaces with:
- **Group Chat** with WebSocket-powered messaging
- **Shared Planner** for coordinated task management
- **File Library** for centralized material sharing
- **Collaborative Whiteboard** for brainstorming sessions

<div align="center">
<img src="public/showcase/group.png" alt="Nemesis Dashboard" width="100%" />
</div>

### 📅 04. Planner
A fully-featured task management system with subtasks, due dates, group assignments, and Pomodoro timer integration. Never miss a deadline again.

<div align="center">
<img src="public/showcase/planner.png" alt="Nemesis Dashboard" width="100%" />
</div>

### 🏆 05. Gamification
A complete points and badges system that rewards consistent study habits, uploads, and collaboration. Climb the leaderboard and track your streak.

### 🔔 06. Smart Notifications
Real-time notifications for group activity, task reminders, announcements, and system alerts — delivered instantly via Supabase Realtime.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, TypeScript, Vite 5, Framer Motion |
| **Styling** | Tailwind CSS v4 |
| **Cross-Platform** | Capacitor (iOS & Android) |
| **Backend** | Supabase (PostgreSQL, Auth, Storage, Edge Functions) |
| **Security** | Row Level Security (RLS), PKCE OAuth Flow |
| **Offline-First** | Dexie.js (IndexedDB), Service Worker (PWA) |
| **Cloud Sync** | Google Drive API integration |
| **Testing** | Vitest, React Testing Library |
| **CI/CD** | GitHub Actions (Node.js 24) |
| **Monitoring** | Sentry |

---

## 🏗️ Architecture

```
Nemesis
├── src/
│   ├── components/       # Reusable UI components
│   ├── pages/            # Route-level pages
│   │   ├── auth/         # Login, Signup, Reset
│   │   ├── organizer/    # Study material management
│   │   ├── groups/       # Real-time collaboration
│   │   └── admin/        # Admin control panel
│   ├── store/            # Zustand global state
│   ├── lib/              # Core utilities
│   │   ├── SyncEngine.ts # Offline-first sync logic
│   │   ├── supabase.ts   # DB client & crash reporter
│   │   └── gamification.ts # Points & badges engine
│   └── hooks/            # Custom React hooks
├── supabase/
│   ├── functions/        # Edge Functions (Deno)
│   └── *.sql             # Database migrations
├── public/
│   └── showcase/         # App screenshots
└── .github/workflows/    # CI/CD pipelines
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 24+
- A Supabase project

### Installation

```bash
# Clone the repository
git clone https://github.com/Sh123e5h/Nemesis.git
cd Nemesis

# Install dependencies
npm install

# Copy the environment template
cp .env.example .env
# Fill in your Supabase URL and Anon Key

# Start the development server
npm run dev
```

### Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run test     # Run Vitest test suite
npm run lint     # Run ESLint
```

---

## 🛡️ Production Readiness

| Feature | Status |
|---|---|
| Automated Testing (Vitest) | ✅ Active |
| CI/CD (GitHub Actions) | ✅ Active |
| Error Monitoring (Sentry) | ✅ Integrated |
| Offline-First PWA | ✅ Active |
| Row Level Security | ✅ Enforced |
| Environment Separation | ✅ Configured |
| PKCE OAuth Flow | ✅ Active |

---

## 👨‍💻 The Architect

<div align="center">
  <img src="public/shireesh.webp" alt="Shireesh Kashyap" width="400" style="border-radius: 50%;" />

  **Shireesh Kashyap**
  *Lead Architect & Founder*

  Computer Science Engineer

  *"From hacking school systems out of curiosity to building production-grade platforms out of purpose."*
</div>

---

## 📖 Documentation

The full official documentation — including architecture deep-dives, database schema, lore, and the Architect's Note — is available as a PDF in this repository:

📄 **[Nemesis_Official_Documentation.pdf](./Nemesis_Official_Documentation.pdf)**

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to open a [GitHub Issue](https://github.com/Sh123e5h/Nemesis/issues).

---

<div align="center">
  <p>Built with ❤️ by Team Genesis. All rights reserved.</p>
  <p><em>Nemesis — where intelligence meets purpose.</em></p>
</div>
