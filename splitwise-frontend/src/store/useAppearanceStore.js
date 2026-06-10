import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useAppearanceStore = create(
  persist(
    (set) => ({
      direction: 'a',
      mode: 'light',
      setDirection: (direction) => set({ direction }),
      setMode: (mode) => set({ mode }),
      setAppearance: ({ direction, mode }) =>
        set((s) => ({
          direction: direction ?? s.direction,
          mode: mode ?? s.mode,
        })),
    }),
    { name: 'splitwise-appearance' }
  )
);

export default useAppearanceStore;
