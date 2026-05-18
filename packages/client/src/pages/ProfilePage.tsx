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
    return <div>Загрузка...</div>;
  }

  if (!user) {
    return null;
  }

  return (
    <div>
      <h1>Профиль</h1>
      <p>Имя: {user.name}</p>
      <p>Email: {user.email}</p>
      <p>Роль: {user.role === 'teacher' ? 'Учитель' : 'Студент'}</p>
      <button onClick={handleLogout}>Выйти</button>
    </div>
  );
}

export default ProfilePage;