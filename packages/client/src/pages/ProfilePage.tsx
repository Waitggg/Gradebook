import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface ProfilePageProps {
  onLogout: () => void;
}

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

function ProfilePage({ onLogout }: ProfilePageProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/auth/profile', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        navigate('/login');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        onLogout();
        navigate('/login');
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return (
      <div className="profile-page">
        <div className="profile-container">
          <div className="profile-card">
            <div className="loading-spinner">Загрузка...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="profile-page">
      <div className="profile-container">
        <div className="profile-card">
          <div className="profile-header">
            <div className="profile-avatar">
              <span className="avatar-text">
                {user.name?.charAt(0)?.toUpperCase() || '?'}
              </span>
            </div>
            <h1 className="profile-title">Профиль пользователя</h1>
            <p className="profile-subtitle">Ваша личная информация</p>
          </div>

          <div className="profile-info">
            <div className="info-group">
              <label className="info-label">Имя</label>
              <div className="info-value">{user.name}</div>
            </div>

            <div className="info-group">
              <label className="info-label">Email</label>
              <div className="info-value">{user.email}</div>
            </div>

            <div className="info-group">
              <label className="info-label">Роль</label>
              <div className="info-value role-badge">
                {user.role === 'teacher' ? 'Учитель' : 'Студент'}
              </div>
            </div>
          </div>

          <button onClick={handleLogout} className="logout-btn">
            Выйти из аккаунта
          </button>
        </div>
      </div>

      <style>{`
        .profile-page {
          min-height: 100vh;
          background: #f3f4f6;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .profile-container {
          width: 100%;
          max-width: 500px;
        }

        .profile-card {
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

        .profile-header {
          text-align: center;
          margin-bottom: 32px;
        }

        .profile-avatar {
          display: flex;
          justify-content: center;
          margin-bottom: 20px;
        }

        .avatar-text {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: #3b82f6;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 36px;
          font-weight: 600;
          color: white;
        }

        .profile-title {
          font-size: 28px;
          font-weight: 700;
          color: #1f2937;
          margin-bottom: 8px;
        }

        .profile-subtitle {
          font-size: 14px;
          color: #6b7280;
        }

        .profile-info {
          display: flex;
          flex-direction: column;
          gap: 20px;
          margin-bottom: 32px;
        }

        .info-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .info-label {
          font-size: 14px;
          font-weight: 600;
          color: #374151;
        }

        .info-value {
          padding: 12px;
          background: #f9fafb;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          font-size: 14px;
          color: #1f2937;
        }

        .role-badge {
          display: inline-block;
          background: #dbeafe;
          color: #1e40af;
          border-color: #bfdbfe;
        }

        .logout-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 12px 24px;
          background: #ef4444;
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .logout-btn:hover {
          background: #dc2626;
          transform: translateY(-2px);
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        }

        .logout-btn:active {
          transform: translateY(0);
        }

        .loading-spinner {
          text-align: center;
          padding: 40px;
          color: #6b7280;
          font-size: 16px;
        }

        @media (max-width: 480px) {
          .profile-card {
            padding: 32px 24px;
          }

          .profile-title {
            font-size: 24px;
          }

          .avatar-text {
            width: 60px;
            height: 60px;
            font-size: 28px;
          }
        }
      `}</style>
    </div>
  );
}

export default ProfilePage;