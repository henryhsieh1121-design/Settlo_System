// 統一錯誤處理 Middleware，避免各 route 重複撰寫 500 錯誤回應
const errorHandler = (err, req, res, next) => {
  console.error('[Error]', err.message);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || '伺服器發生錯誤',
  });
};

module.exports = errorHandler;
