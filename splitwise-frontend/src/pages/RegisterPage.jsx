import LoginPage from './LoginPage';

// RegisterPage 合併到 LoginPage，預設顯示註冊 tab
export default function RegisterPage() {
  return <LoginPage initialMode="register" />;
}
