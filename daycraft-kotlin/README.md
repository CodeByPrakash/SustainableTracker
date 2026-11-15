# DAYCRAFT — Native Android (Kotlin + Jetpack Compose)

This directory contains the **100% Native Android Kotlin** edition of DAYCRAFT, engineered with **Jetpack Compose**, **Material 3**, **Room SQLite Database**, and a **Real Hardware Wakeup Alarm Engine**.

---

## 🌟 Highlights of the Native Kotlin Edition

- **True Alarm Clock Wakeup**: Uses Android's `AlarmManager.setAlarmClock()`, allowing the phone to wake up from Deep Doze and launch a full-screen ringing UI (`showWhenLocked`, `turnScreenOn`) even when the device is locked.
- **Custom Music Engine**: Custom morning audio or songs selected from the phone are streamed directly via `MediaPlayer` through a high-priority foreground service (`AlarmService`).
- **Instant Cold Boot (~150ms)**: Zero JavaScript bridge or runtime overhead.
- **Google Room Database**: 100% offline-first with compile-time SQL verification, reactive `Flow`, and automated schema creation with starter data.
- **Authentic Daycraft Design System**:
  - Warm Canvas (`#FFF8EF`)
  - Card Surface (`#FFFFFF`) & Line Borders (`#E8DDD0`)
  - Gym Orange (`#E87935`) & Academics Green (`#2F855A`)
  - Dark Ink (`#202A3B`) & Accessible Muted Ink (`#585652`)

---

## 📁 Project Architecture

```
daycraft-kotlin/
├── app/
│   ├── build.gradle.kts          # Gradle build dependencies & Compose setup
│   ├── proguard-rules.pro        # R8 / ProGuard minification rules
│   └── src/main/
│       ├── AndroidManifest.xml   # Permissions, AlarmReceiver, AlarmService, RingingActivity
│       └── java/com/daycraft/app/
│           ├── DaycraftApp.kt    # Application class & Notification Channels
│           ├── MainActivity.kt   # Root Scaffold & Navigation Compose
│           ├── data/local/       # Room Database, Entities & DAOs
│           │   ├── DaycraftDatabase.kt
│           │   ├── entities/     # HabitEntity, ScheduleBlockEntity, AlarmEntity, WorkoutPlanEntity
│           │   └── daos/         # HabitDao, ScheduleDao, AlarmDao, WorkoutDao
│           ├── alarm/            # Real Hardware Alarm Manager
│           │   ├── AlarmScheduler.kt       # Exact alarm calculation & scheduling
│           │   ├── AlarmReceiverAndService.kt # BroadcastReceiver + Foreground Service
│           │   └── AlarmRingingActivity.kt # Full-screen wakeup alert with Snooze/Dismiss
│           └── ui/
│               ├── theme/        # Color.kt, Type.kt, Theme.kt
│               └── screens/      # HomeScreen, AlarmScreen, GymScreen
└── gradle/
    ├── libs.versions.toml        # Modern Gradle Version Catalog
    └── wrapper/                  # Gradle 9.4.1 wrapper
```

---

## 🔨 How to Build & Run

### In Android Studio:
1. Open **Android Studio** (Ladybug, Meerkat, or newer).
2. Click **Open** and select the `daycraft-kotlin` folder.
3. Allow Gradle to sync dependencies.
4. Select your connected Android device or emulator and press **Run (Shift + F10)**.

### Via Command Line:
```bash
cd daycraft-kotlin

# Build debug APK
./gradlew assembleDebug

# Build optimized release APK
./gradlew assembleRelease
```
The compiled APK will be located at:
`daycraft-kotlin/app/build/outputs/apk/debug/app-debug.apk`
