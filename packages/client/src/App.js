import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
    const [isAuth, setIsAuth] = useState(false);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        checkAuthStatus();
    }, []);
    const checkAuthStatus = async () => {
        try {
            const response = await fetch('/api/auth/profile', {
                credentials: 'include'
            });
            setIsAuth(response.ok);
        }
        catch (error) {
            setIsAuth(false);
        }
        finally {
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
        return _jsx("div", { className: "loading", children: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430..." });
    }
    return (_jsxs(BrowserRouter, { children: [isAuth && _jsx(Header, {}), _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(Navigate, { to: isAuth ? "/profile" : "/login", replace: true }) }), _jsx(Route, { path: "/login", element: isAuth ? _jsx(Navigate, { to: "/profile" }) : _jsx(LoginPage, { onLogin: handleLogin }) }), _jsx(Route, { path: "/profile", element: isAuth ?
                            _jsx(ProfilePage, { onLogout: handleLogout }) :
                            _jsx(Navigate, { to: "/login", replace: true }) }), _jsx(Route, { path: "/gradebook", element: isAuth ?
                            _jsx(GradebookPage, {}) :
                            _jsx(Navigate, { to: "/login", replace: true }) }), _jsx(Route, { path: "/schedule", element: isAuth ?
                            _jsx(SchedulePage, {}) :
                            _jsx(Navigate, { to: "/login", replace: true }) }), _jsx(Route, { path: "/manage-students", element: isAuth ?
                            _jsx(ManageStudentsPage, {}) :
                            _jsx(Navigate, { to: "/login", replace: true }) }), _jsx(Route, { path: "/labs", element: isAuth ?
                            _jsx(LabStudentPage, {}) :
                            _jsx(Navigate, { to: "/login", replace: true }) }), _jsx(Route, { path: "/check-labs", element: isAuth ?
                            _jsx(TeacherLabCheckPage, {}) :
                            _jsx(Navigate, { to: "/login", replace: true }) }), _jsx(Route, { path: "/course/:subjectId/:classId", element: isAuth ?
                            _jsx(CourseProgramPage, {}) :
                            _jsx(Navigate, { to: "/login", replace: true }) })] })] }));
}
export default App;
