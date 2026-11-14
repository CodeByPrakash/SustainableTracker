# DAYCRAFT ⚡
### Offline-First Personal Lifestyle & Engineering Productivity Engine

[![React Native](https://img.shields.io/badge/React%20Native-0.88-61DAFB?logo=react&logoColor=black)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-SDK%2058-000020?logo=expo&logoColor=white)](https://expo.dev/)
[![SQLite](https://img.shields.io/badge/SQLite-WAL%20Mode-003B57?logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Android%20%7C%20iOS%20%7C%20Web-brightgreen)](#)
[![Privacy](https://img.shields.io/badge/Data%20Privacy-100%25%20Offline%20Local-success)](#)

> **DAYCRAFT** is a zero-latency, offline-first personal lifestyle and academic operating system designed specifically for engineering students. It unifies **Daily Agenda Planning**, **Syllabus & Focus Sessions**, **Progressive Strength Training**, **Technical Skill Sprints**, and **Wellness Tracking** into an elegant, distraction-free native experience with **100% local SQLite storage** and zero third-party tracking.

---

## 🌟 Key Features

### 📅 1. Dynamic Planner & Timetable Agenda
- **College & Weekend Blueprint**: Pre-configured weekday schedules (Mon–Fri), Saturday Deep-Work Sprints (Legs + DSA + Project Sprint), and Sunday Active Recovery & Weekly Blueprint routines.
- **Editable Timetables**: Add, update, reorder, or delete recurring commitments and single-day tasks on the fly.
- **Weekly Auto-Reset**: Automatic Monday agenda checkbox reset or one-tap manual reset per day/week so you always start fresh.
- **Audible Android Notifications**: Native high-priority system chime reminders alerting you 0 to 15 minutes before upcoming commitments.

### 🏋️ 2. Gym & Progressive Overload Split (Calibrated for 55 kg)
- **Push / Pull / Legs Split**: Tailored for hyper-efficient hypertrophy and athletic strength with weight recommendations starting at bodyweight baseline.
- **Interactive Workout Mode**: Live exercise tracker with set logging, checkoffs, rest timer with haptic pulse, and personal record tracking.
- **Body Metric Log**: Track body weight, chest, waist, biceps, and body fat progress over time.

### 📚 3. Academics & Collapsible Syllabus Navigator
- **Hierarchical Course Breakdown**: Subjects (e.g., *Design & Analysis of Algorithms*, *Operating Systems*, *Theory of Computation*) organized into collapsible Units and individual topics.
- **Granular Topic Status**: One-tap toggle between `NOT STARTED`, `IN PROGRESS`, and `COMPLETED` with dynamic progress bars.
- **Integrated Pomodoro Study Timer**: 25m focus / 5m break intervals with active focus logging directly attributed to the subject's weekly target.

### 💻 4. Technical Skills Hub
- Track dedicated time toward Core DSA, Full-Stack Engineering, System Design, and Open-Source Contributions.
- Visual weekly target progress bars with session logs.

### 🌿 5. Wellness & Habit Consistency
- **Morning & Night Skincare Protocols**: Step-by-step skincare checklists for pollution defense and nightly cellular recovery.
- **Hydration Tracker**: Quick-log water intake (250ml, 500ml, 750ml) with target indicators.
- **Daily Streak Engine**: Tracks daily streaks and consistency across all custom habits.

### 📊 6. 100% Real Analytics & Visual Heatmap
- **Zero Mock Data**: All percentages, charts, and metrics are computed live from authentic SQLite logs.
- **Interactive Weekly Bar Charts**: Visualizes study hours and workout sessions across Mon–Sun.
- **35-Day Consistency Heatmap**: GitHub-style activity grid measuring real multi-week discipline.

---

## 🎨 Design Philosophy & Palette

DAYCRAFT implements a tactile, humanistic design language inspired by physical stationery, warm studio desks, and high-contrast editorial typography.

| Token | Hex | Role |
| :--- | :--- | :--- |
| **Canvas** | `#FFF8EF` | Warm, calming cream background reducing eye strain |
| **Surface** | `#FFFFFF` | Crisp elevated card surface with subtle border strokes |
| **Ink** | `#202A3B` | Deep slate navy text offering superior contrast |
| **Ink Muted** | `#6B7280` | Secondary metadata, timestamps, and subtitles |
| **Accent Orange**| `#E87935` | Energetic terracotta primary accent for actions & fitness |
| **Sage Green** | `#2F855A` | Calming focus green for academics and completed states |
| **Line / Border**| `#E5DEC9` | Physical-feel dividers with 1px border precision |

- **Spacing**: Strict 8-point geometric grid (`4px`, `8px`, `16px`, `24px`, `32px`).
- **Typography**: Tabular numerals for timers and metrics, readable system fonts.
- **Haptics**: Subtle tactile feedback on every checkbox toggle and timer completion.

---

## 🏗️ Architecture & Tech Stack

```
daycraft/
├── app/                        # Expo Router Navigation (File-based)
│   ├── (tabs)/
│   │   ├── index.tsx           # Home Dashboard & Today's Schedule
│   │   ├── plan.tsx            # Full Editable Planner & Agenda
│   │   ├── gym.tsx             # Workout Split & Exercise Log
│   │   ├── academics.tsx       # Collapsible Syllabus & Study Hub
│   │   └── stats.tsx           # 100% Real SQLite Analytics & Heatmap
│   ├── study-active.tsx        # Live Pomodoro Study Screen
│   ├── workout-active.tsx      # Live Workout Tracker Screen
│   ├── habits.tsx              # Habit Tracker & Skincare Protocol
│   ├── skills.tsx              # Technical Skills Progress
│   ├── settings.tsx            # Notification & Data Management
│   └── _layout.tsx             # Root Stack & Database Bootstrap
├── src/
│   ├── components/ui/          # Reusable Accessible UI Components
│   ├── db/
│   │   ├── database.ts         # SQLite WAL Initialization (19 Tables)
│   │   ├── seeds.ts            # Default Schedules, Exercises & Syllabi
│   │   └── queries/            # Isolated Data Access Queries
│   ├── stores/                 # Zustand Reactive State Stores
│   ├── theme/                  # Color tokens, Typography & Spacing
│   └── utils/                  # Date formatting, Notifications & Haptics
└── assets/                     # Vector icons, splash screens & audio chimes
```

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or later recommended)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- An Android or iOS device with [Expo Go](https://expo.dev/go) (for quick dev testing) or USB debugging enabled for standalone installation.

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/daycraft.git
   cd daycraft
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the local development server:**
   ```bash
   npx expo start
   ```

4. **Launch on your device:**
   - Press `a` in the terminal to launch on a connected Android device/emulator.
   - Or scan the QR code with the **Expo Go** app on Android.

---

## 📱 Installing the App Permanently on Android (Standalone APK)

To install DAYCRAFT directly on your Android phone as a permanent, standalone app without needing Expo Go or a connected PC:

### Option A: Cloud Build with EAS (Fastest & Easiest)
1. Install EAS CLI and log in:
   ```bash
   npm install -g eas-cli
   npx eas login
   ```
2. Build the release APK:
   ```bash
   npx eas build -p android --profile preview
   ```
3. When the build completes, download the resulting `.apk` file from the terminal link or scan the QR code to install directly on your phone.

### Option B: Local Android Build via Gradle
```bash
npx expo prebuild --platform android
cd android
./gradlew assembleRelease
```
The output APK is located at:
`android/app/build/outputs/apk/release/app-release.apk`

---

## 🔒 Security & Offline Guarantee

DAYCRAFT is designed with privacy as a foundational principle:
- **Zero Remote Telemetry**: No third-party analytics, crash trackers, or cloud tracking libraries.
- **Local SQLite Database**: Your habits, workouts, academic notes, and schedules are stored exclusively on your device (`daycraft.db`).
- **Encrypted Exports**: Back up and restore your raw SQLite database at any time from the in-app Settings menu.

---

## 🤝 Contributing

Contributions, bug reports, and feature requests are welcome!
Please check out [CONTRIBUTING.md](./CONTRIBUTING.md) and review our [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) before submitting pull requests.

---

## 📄 License

This project is open-source and available under the terms of the [MIT License](./LICENSE).
