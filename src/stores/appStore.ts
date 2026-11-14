import { create } from 'zustand';

interface AppState {
  refreshKey: number;
  triggerRefresh: () => void;
  activeWorkoutSessionId: string | null;
  setActiveWorkoutSession: (id: string | null) => void;
  dbReady: boolean;
  setDbReady: (ready: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  refreshKey: 0,
  triggerRefresh: () => set((state) => ({ refreshKey: state.refreshKey + 1 })),
  activeWorkoutSessionId: null,
  setActiveWorkoutSession: (id) => set({ activeWorkoutSessionId: id }),
  dbReady: false,
  setDbReady: (ready) => set({ dbReady: ready }),
}));
