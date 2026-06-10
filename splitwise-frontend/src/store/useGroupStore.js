import { create } from 'zustand';

// 群組全域狀態：群組列表與當前群組
const useGroupStore = create((set) => ({
  groups: [],
  currentGroup: null,
  members: [],

  setGroups: (groups) => set({ groups }),
  setCurrentGroup: (group, members = []) => set({ currentGroup: group, members }),
  addGroup: (group) => set((s) => ({ groups: [group, ...s.groups] })),
  removeGroup: (groupId) => set((s) => ({ groups: s.groups.filter((g) => g.id !== groupId) })),
}));

export default useGroupStore;
