import { create } from 'zustand';

// 認證全域狀態：用戶資訊與 JWT token
const useAuthStore = create((set) => ({
  user: null,
  token: localStorage.getItem('token') || null,

  // 登入：儲存 token 至 localStorage 並更新狀態
  login: (token, user) => {
    localStorage.setItem('token', token);
    set({ token, user });
  },

  // 登出：清除 localStorage 與狀態
  logout: () => {
    localStorage.removeItem('token');
    set({ token: null, user: null });
  },

  setUser: (user) => set({ user }),
}));

export default useAuthStore;
