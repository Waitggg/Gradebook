import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Header from './components/Header';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';
import GradebookPage from './pages/GradebookPage';
import SchedulePage from './pages/SchedulePage';
import ManageStudentsPage from './pages/ManageStudentsPage';
import LabStudentPage from './pages/LabStudentPage';
import TeacherLabCheckPage from './pages/TeacherLabCheckPage';
import CourseProgramPage from './pages/CourseProgramPage';


function App() {
  const [isAuth, setIsAuth] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/auth/profile', {
        credentials: 'include'
      });
      setIsAuth(response.ok);
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
    return <div className="loading">Загрузка...</div>;
  }

  return (
    <BrowserRouter>
      {isAuth && <Header />}
      <Routes>
        <Route path="/login" element={
          isAuth ? <Navigate to="/profile" /> : <LoginPage onLogin={handleLogin} />
        } />
        
        <Route path="/profile" element={
          isAuth ? 
            <ProfilePage onLogout={handleLogout} /> : 
            <Navigate to="/login" replace />
        } />
        
        <Route path="/gradebook" element={
          isAuth ?
            <GradebookPage /> :
            <Navigate to="/login" replace />
        } />
        
        <Route path="/schedule" element={
          isAuth ?
            <SchedulePage /> :
            <Navigate to="/login" replace />
        } />
        
        <Route path="/manage-students" element={
          isAuth ?
            <ManageStudentsPage /> :
            <Navigate to="/login" replace />
        } />

        <Route path="/labs" element={
          isAuth ?
              <LabStudentPage /> :
              <Navigate to="/login" replace />
        } />

        <Route path="/check-labs" element={
          isAuth ?
              <TeacherLabCheckPage /> :
              <Navigate to="/login" replace />
        } />
        <Route path="/course/:subjectId/:classId" element={
  isAuth ?
    <CourseProgramPage /> :
    <Navigate to="/login" replace />
} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;