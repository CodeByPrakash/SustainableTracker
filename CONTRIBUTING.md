# Contributing to DAYCRAFT

Thank you for your interest in improving DAYCRAFT! Whether you are fixing a bug, refining responsive mobile layouts, adding study/workout features, or optimizing SQLite queries, we welcome your contributions.

---

## 🛠️ Development Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/daycraft.git
   cd daycraft
   ```

2. **Install project dependencies:**
   ```bash
   npm install
   ```

3. **Start Expo Dev Server:**
   ```bash
   npx expo start
   ```

---

## 📐 Design & Engineering Principles

When making changes to the DAYCRAFT codebase, please observe the following core rules:

1. **Offline-First & Local Storage**:
   - All user data must persist into the local SQLite database (`daycraft.db`).
   - Never introduce dependencies that silently sync private user data to remote cloud servers.

2. **UI & Theme Tokens**:
   - Always reference colors and typography from `src/theme/colors.ts` and `src/theme/typography.ts`.
   - Primary palette: Warm Cream (`#FFF8EF`), Slate Navy (`#202A3B`), Terracotta Orange (`#E87935`), Forest Green (`#2F855A`).
   - Use the strict 8-point geometric grid (`4px`, `8px`, `16px`, `24px`, `32px`).

3. **Typography & Visuals**:
   - Use tabular figures for numerical displays, countdown timers, and counters.
   - Use vector icons from `lucide-react-native`.

4. **Code Quality**:
   - Ensure strict TypeScript compliance before submitting changes:
     ```bash
     npm run start -- --reset-cache
     node --stack-size=8192 ./node_modules/typescript/bin/tsc --noEmit
     ```

---

## 🌿 Contribution Workflow

1. **Create a Feature Branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. **Make Atomic Commits**:
   - Use clear commit messages following conventional commits (e.g., `feat: add weekly reset button`, `fix: resolve date timezone offset in schedule query`).
3. **Verify Locally**:
   - Run type checks and verify that the app builds cleanly on Android and Web.
4. **Submit a Pull Request**:
   - Open a PR against the `main` branch with a clear description of the problem solved, screenshots of UI changes, and testing notes.

---

## 💡 Suggestions & Ideas
Have an idea for a new feature? Feel free to open a Feature Request in the GitHub Issues tab to discuss the implementation details with maintainers!
