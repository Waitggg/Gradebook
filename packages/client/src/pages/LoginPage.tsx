import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface LoginPageProps {
  onLogin: () => void;
}

function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok) {
        onLogin();
        navigate('/profile');
      } else {
        setError(data.message || 'Ошибка входа');
      }
    } catch (err) {
      setError('Ошибка соединения с сервером');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <div className="login-logo">
              <span className="login-logo-text">GradeBook</span>
            </div>
            <h1 className="login-title">Добро пожаловать</h1>
            <p className="login-subtitle">Войдите в свой аккаунт</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label className="form-label">Email</label>
              <div className="input-wrapper">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="teacher@school.ru"
                  required
                  disabled={isLoading}
                  className="form-input"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Пароль</label>
              <div className="input-wrapper">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={isLoading}
                  className="form-input"
                />
              </div>
            </div>

            {error && (
              <div className="error-message">
                <span>{error}</span>
              </div>
            )}

            <button type="submit" disabled={isLoading} className="login-btn">
              {isLoading ? (
                <>
                  <span className="spinner"></span>
                  Вход...
                </>
              ) : (
                'Войти'
              )}
            </button>
          </form>
        </div>
      </div>

      <style>{`
        .login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .login-container {
          width: 100%;
          max-width: 440px;
        }

        .login-card {
          background: white;
          border-radius: 24px;
          padding: 40px 32px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          animation: slideUp 0.5s ease-out;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .login-header {
          text-align: center;
          margin-bottom: 32px;
        }

        .login-logo {
          margin-bottom: 24px;
        }

        .login-logo-text {
          font-size: 32px;
          font-weight: 700;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .login-title {
          font-size: 28px;
          font-weight: 700;
          color: #3b82f6;
          margin-bottom: 8px;
        }

        .login-subtitle {
          font-size: 14px;
          color: #6b7280;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-label {
          font-size: 14px;
          font-weight: 600;
          color: #374151;
        }

        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .form-input {
          width: 100%;
          padding: 12px 12px 12px 12px;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          font-size: 14px;
          transition: all 0.2s;
          background: white;
          color: black;
        }

        .form-input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .form-input:disabled {
          background: #f9fafb;
          cursor: not-allowed;
        }

        .error-message {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px;
          background: #fee2e2;
          border-radius: 12px;
          color: #dc2626;
          font-size: 14px;
        }

        .login-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px 24px;
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          margin-top: 8px;
          background: 3b82f6;
        }

        .login-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        }

        .login-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .login-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .login-footer {
          margin-top: 24px;
          text-align: center;
        }

        @media (max-width: 480px) {
          .login-card {
            padding: 32px 24px;
          }

          .login-title {
            font-size: 24px;
          }

          .form-input {
            padding: 10px 12px 10px 12px;
            background: white;
            color: black;
          }

        }
      `}</style>
    </div>
  );
}

export default LoginPage;