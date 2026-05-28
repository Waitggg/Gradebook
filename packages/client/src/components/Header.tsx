import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import GradeNotification from './Notification';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'teacher' | 'student' | 'admin';
}

function Header() {
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const response = await fetch('/api/auth/profile', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      }
    } catch (error) {
      console.error('Fetch user error:', error);
    }
  };

  const navLinks = [
    { path: '/gradebook', label: 'Журнал' },
    { path: '/schedule', label: 'Расписание' },
  ];

  if (user?.role === 'admin') {
    navLinks.push({ path: '/manage-students', label: 'Управление'});
  }

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <header className="header">
      <div className="header-container">
        <Link to="/profile" className="logo">
          <span className="logo-text">GradeBook</span>
        </Link>

        <button 
          className="mobile-menu-btn"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          ☰
        </button>

        <nav className={`nav-menu ${isMenuOpen ? 'open' : ''}`}>
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`nav-link ${isActive(link.path) ? 'active' : ''}`}
              onClick={() => setIsMenuOpen(false)}
            >
              <span>{link.label}</span>
            </Link>
          ))}
        </nav>
        <div className="user-menu">
            <GradeNotification />
        <a href='/profile' className="user-menu-link">
          <div className="user-info">
            <span className="user-avatar">
              {user?.name?.charAt(0)?.toUpperCase() || '?'}
            </span>
            <div className="user-details">
              <span className="user-name">{user?.name}</span>
              <span className="user-role">
              {user?.role === 'admin' ? 'Админ' : user?.role === 'teacher' ? 'Учитель' : 'Студент'}
              </span>
            </div>
          </div>
            </a>
        </div>
      </div>

      <style>{`
        .header {
          background: white;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .header-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 12px 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 24px;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 8px;
          text-decoration: none;
          font-size: 20px;
          font-weight: 700;
          color: #1f2937;
          transition: opacity 0.2s;
        }

        .logo:hover {
          opacity: 0.8;
        }

        .logo-text {
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .mobile-menu-btn {
          display: none;
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          padding: 8px;
          border-radius: 8px;
          transition: background 0.2s;
        }

        .mobile-menu-btn:hover {
          background: #f3f4f6;
        }

        .nav-menu {
          display: flex;
          gap: 8px;
          flex: 1;
        }

        .nav-link {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border-radius: 8px;
          text-decoration: none;
          color: #4b5563;
          font-weight: 500;
          transition: all 0.2s;
        }

        .nav-link:hover {
          background: #f3f4f6;
          color: #1f2937;
        }

        .nav-link.active {
          background: #3b82f6;
          color: white;
        }

        .user-menu {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .user-info {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 4px 12px 4px 4px;
          border-radius: 40px;
          background: #f9fafb;
        }

        .user-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
          font-size: 16px;
        }

        .user-details {
          display: flex;
          flex-direction: row;
          gap: 10px;
        }

        .user-name {
          font-size: 14px;
          font-weight: 600;
          color: #1f2937;
        }

        .user-role {
          font-size: 12px;
          color: #6b7280;
        }

        @media (max-width: 768px) {
          .header-container {
            padding: 12px 16px;
          }

          .logo-text {
            display: none;
          }

          .mobile-menu-btn {
            display: block;
          }

          .nav-menu {
            position: fixed;
            top: 64px;
            left: -100%;
            width: 100%;
            height: calc(100vh - 64px);
            background: white;
            flex-direction: column;
            padding: 16px;
            gap: 8px;
            transition: left 0.3s ease;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          }

          .nav-menu.open {
            left: 0;
          }

          .nav-link {
            padding: 12px 16px;
          }

          .user-details {
            display: none;
          }

          .user-info {
            padding: 4px;
          }

          .logout-btn span {
            display: none;
          }
            
        .user-menu-link {
            text-decoration: none;
            color: inherit;
            display: block;
        }

        .user-menu-link:hover {
            background-color: rgba(0, 0, 0, 0.05);
            border-radius: 8px;
        }
        }
      `}</style>
    </header>
  );
}

export default Header;