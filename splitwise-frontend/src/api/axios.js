import axios from 'axios';

// 統一管理 baseURL 與 JWT Authorization Header
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '',
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor：自動附加 Bearer token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor：自動重試冷啟動失敗 + token 過期登出
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;

    // 網路錯誤或 503（Render 冷啟動）：等 3 秒後重試一次
    if (!config._retried && (!error.response || error.response.status === 503)) {
      config._retried = true;
      await new Promise((resolve) => setTimeout(resolve, 3000));
      return api(config);
    }

    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      const redirect = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `/login?redirect=${redirect}`;
    }
    return Promise.reject(error);
  }
);

export default api;
