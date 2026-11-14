import { create } from 'zustand';

interface TimerState {
  // Rest timer (gym)
  restTimerActive: boolean;
  restTimerSeconds: number;
  restTimerTotal: number;
  startRestTimer: (seconds: number) => void;
  tickRestTimer: () => void;
  stopRestTimer: () => void;

  // Focus timer (study)
  focusTimerActive: boolean;
  focusTimerSeconds: number;
  focusTimerSubjectId: string | null;
  focusTimerTopicId: string | null;
  startFocusTimer: (subjectId: string, topicId?: string | null) => void;
  tickFocusTimer: () => void;
  stopFocusTimer: () => { duration: number; subjectId: string | null; topicId: string | null };
  pauseFocusTimer: () => void;
  resumeFocusTimer: () => void;
  focusTimerPaused: boolean;
}

export const useTimerStore = create<TimerState>((set, get) => ({
  // Rest timer
  restTimerActive: false,
  restTimerSeconds: 0,
  restTimerTotal: 0,
  startRestTimer: (seconds) =>
    set({ restTimerActive: true, restTimerSeconds: seconds, restTimerTotal: seconds }),
  tickRestTimer: () => {
    const { restTimerSeconds } = get();
    if (restTimerSeconds <= 1) {
      set({ restTimerActive: false, restTimerSeconds: 0 });
    } else {
      set({ restTimerSeconds: restTimerSeconds - 1 });
    }
  },
  stopRestTimer: () => set({ restTimerActive: false, restTimerSeconds: 0, restTimerTotal: 0 }),

  // Focus timer
  focusTimerActive: false,
  focusTimerSeconds: 0,
  focusTimerSubjectId: null,
  focusTimerTopicId: null,
  focusTimerPaused: false,
  startFocusTimer: (subjectId, topicId = null) =>
    set({
      focusTimerActive: true,
      focusTimerSeconds: 0,
      focusTimerSubjectId: subjectId,
      focusTimerTopicId: topicId ?? null,
      focusTimerPaused: false,
    }),
  tickFocusTimer: () => {
    const { focusTimerPaused } = get();
    if (!focusTimerPaused) {
      set((state) => ({ focusTimerSeconds: state.focusTimerSeconds + 1 }));
    }
  },
  stopFocusTimer: () => {
    const { focusTimerSeconds, focusTimerSubjectId, focusTimerTopicId } = get();
    set({
      focusTimerActive: false,
      focusTimerSeconds: 0,
      focusTimerSubjectId: null,
      focusTimerTopicId: null,
      focusTimerPaused: false,
    });
    return { duration: focusTimerSeconds, subjectId: focusTimerSubjectId, topicId: focusTimerTopicId };
  },
  pauseFocusTimer: () => set({ focusTimerPaused: true }),
  resumeFocusTimer: () => set({ focusTimerPaused: false }),
}));
