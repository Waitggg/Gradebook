import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';

function App() {
  const [isAuth, setIsAuth] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/profile', {
        credentials: 'include'
      });
      
      if (response.ok) {
        setIsAuth(true);
      } else {
        setIsAuth(false);
      }
    } catch (error) {
      setIsAuth(false);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => {
    setIsAuth(true);
  };

  const handleLogout = () => {
    setIsAuth(false);
  };

  if (loading) {
    return <div>Загрузка...</div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={
          isAuth ? <Navigate to="/profile" /> : <LoginPage onLogin={handleLogin} />
        } />
        
        <Route path="/profile" element={
          isAuth ? 
            <ProfilePage onLogout={handleLogout} /> : 
            <Navigate to="/login" replace />
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;