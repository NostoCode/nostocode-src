# NostoCode — Ancient Coding Mode OJ

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black)](https://nostocode.vercel.app)

> **NostoCode** is a LeetCode-style competitive programming platform with **Ancient Coding Mode** — an anti-cheat system that enforces manual typing, disables AI tools, and scores every submission on coding behaviour.

🌐 **Live:** [nostocode.vercel.app](https://nostocode.vercel.app)  
🏠 **Landing page:** [NostoCode.github.io](https://NostoCode.github.io)

---

## Ancient Coding Mode Features

### 🚫 External Paste Disabled
- System clipboard paste blocked in the editor via capture-phase `paste` event listener
- Right-click context menu and drag-and-drop disabled in Monaco
- External content is detected using `ClipboardEvent.clipboardData` (no permission dialog needed)

### ✅ Internal Clipboard System
- Ctrl+C / Ctrl+X copy to an in-memory internal buffer (not the system clipboard)
- Ctrl+V pastes from the internal buffer only
- Pasting internal content does **not** incur a scoring penalty
- Standard VS Code-style shortcuts work: multi-cursor (Ctrl+D), line duplication, line swap (Alt+↑/↓), etc.

### 🧠 Ancient Code Score
Each submission is scored based on behavioural metrics:

| Metric | Description |
|--------|-------------|
| **Typing Ratio** | Fraction of characters typed manually vs inserted in bulk |
| **Rhythm Score** | Variance in time between keystrokes |
| **Edit Activity** | Frequency of backspace / delete use |
| **Large Inserts** | Burst detection: >30 chars in <50 ms |
| **Anti-Paste Score** | Penalises external paste attempts |

**Score Levels:**
- 🟢 Ancient Master: 90–100
- 🟡 Skilled Human: 70–89
- 🟠 Suspicious: 40–69
- 🔴 Likely AI/Paste: 0–39

### 🎨 Themes
- **Modern (Dark)** — clean Tailwind-based dark UI
- **Ancient (Win98)** — Windows 98 pixel-art theme with classic raised-border UI and Courier New font in Monaco

### ❌ Removed
- AI chat bot (`ProblemPageAiTab`, `/api/code/chat-output`)
- External AI hint buttons

---

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router, Turbopack) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Editor | Monaco Editor (`@monaco-editor/react`) |
| Database | MongoDB + Mongoose |
| Auth | NextAuth.js (email/password + Resend email verification) |
| Code Judge | Piston API (self-hostable, no rate limits) |
| Deployment | Vercel |

---

## Local Development

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- Piston instance (or use the public API)

### Setup

```bash
git clone https://github.com/NostoCode/nostocode-src.git
cd nostocode-src
npm install
```

Copy `.env.txt` to `.env.local` and fill in the values:

```
MONGODB_URI=
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
RESEND_API_KEY=
PISTON_API_URL=https://emkc.org/api/v2/piston
```

```bash
npm run dev        # starts on http://localhost:3000 with Turbopack
```

---

## Project Structure

```
src/
├── app/
│   ├── (app)/            # Authenticated app routes
│   │   ├── problem/      # Problem page (editor, run/submit, test results)
│   │   ├── problems/     # Problem list
│   │   ├── dashboard/    # User dashboard (stats, submissions)
│   │   └── ...
│   ├── api/              # Next.js API routes
│   │   ├── auth/         # Sign-up, sign-in, email verification
│   │   ├── code/         # run-code, submit-code, submissions
│   │   ├── problem/      # CRUD for problems
│   │   └── user/         # User profile API
│   └── page.tsx          # Landing page
├── components/
│   ├── ProblemPageCodeEditor.tsx   # Monaco + Ancient Mode logic
│   ├── NavRunButtonsContainer.tsx  # Run/Submit buttons in header nav
│   └── ...
├── context/
│   ├── ThemeContext.tsx            # Win98/Modern theme toggle
│   └── ProblemPageContext.tsx      # Passes run/submit state to header
├── models/               # Mongoose models (User, Problem, Submission)
└── styles/
    └── win98-theme.css   # All Win98/Ancient theme overrides
```

---

## Key Design Decisions

- **Run/Submit buttons live in the header nav row** (alongside "Problem List"), so they appear consistently at the same position regardless of OS/browser/theme.
- **Internal clipboard** uses a module-level variable (`internalClipboard`) so it persists across React re-renders.
- **Paste detection** uses `document.addEventListener("paste", ..., { capture: true })` + `e.clipboardData.getData('text')` — no permission dialogs, reliable cross-browser.
- **AC count deduplication**: `solvedQuestions` is checked before adding a problem ID, so solving the same problem multiple times doesn't inflate the counter.
- **Dashboard charts** (Contest Rating, Top) show "Coming Soon" while backend data is not yet collected.

---

## Original Repository

This project is based on [Leetcode-Clone](https://github.com/Avijit200318/Leetcode-Clone) by Avijit200318.

## License

MIT — see [LICENSE](LICENSE) for details.


