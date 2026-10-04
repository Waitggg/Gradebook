import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
function ProfilePage({ onLogout }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState(null);
    const navigate = useNavigate();
    const [teacherClasses, setTeacherClasses] = useState([]);
    const [allClasses, setAllClasses] = useState([]);
    const [selectedClass, setSelectedClass] = useState(null);
    const [classGrades, setClassGrades] = useState([]);
    const [classAverages, setClassAverages] = useState([]);
    const [studentGrades, setStudentGrades] = useState([]);
    const [studentAverages, setStudentAverages] = useState([]);
    const [activeTab, setActiveTab] = useState('grades');
    useEffect(() => {
        fetchProfile();
    }, []);
    useEffect(() => {
        if (userRole != 'student' && selectedClass) {
            fetchClassGrades();
            fetchClassAverages();
        }
    }, [selectedClass, userRole]);
    const fetchProfile = async () => {
        try {
            const response = await fetch('/api/auth/profile', {
                credentials: 'include',
            });
            if (response.ok) {
                const data = await response.json();
                setUser(data.user);
                setUserRole(data.user.role);
                if (data.user.role === 'teacher') {
                    await fetchTeacherClasses();
                }
                else if (data.user.role === 'admin') {
                    await fetchAllClasses();
                }
                else {
                    await fetchStudentGrades();
                    await fetchStudentAverages();
                }
            }
            else {
                navigate('/login');
            }
        }
        catch (error) {
            console.error('Error fetching profile:', error);
            navigate('/login');
        }
        finally {
            setLoading(false);
        }
    };
    const fetchTeacherClasses = async () => {
        try {
            const response = await fetch('/api/gradebook/myClasses', {
                credentials: 'include'
            });
            if (response.ok) {
                const data = await response.json();
                const classes = data.classes || [];
                setTeacherClasses(classes);
                if (classes.length > 0) {
                    setSelectedClass(classes[0].id);
                }
            }
        }
        catch (error) {
            console.error('Error fetching classes:', error);
        }
    };
    const fetchAllClasses = async () => {
        try {
            const response = await fetch('/api/gradebook/classes', {
                credentials: 'include'
            });
            if (response.ok) {
                const data = await response.json();
                const classes = data.classes || [];
                setAllClasses(classes);
                if (classes.length > 0) {
                    setSelectedClass(classes[0].id);
                }
            }
        }
        catch (error) {
            console.error('Error fetching classes:', error);
        }
    };
    const fetchClassGrades = async () => {
        if (!selectedClass)
            return;
        try {
            const response = await fetch(`/api/gradebook/classes/${selectedClass}/grades`, {
                credentials: 'include'
            });
            if (response.ok) {
                const data = await response.json();
                setClassGrades(data.grades || []);
            }
        }
        catch (error) {
            console.error('Error fetching class grades:', error);
        }
    };
    const fetchClassAverages = async () => {
        if (!selectedClass)
            return;
        try {
            const response = await fetch(`/api/gradebook/classes/${selectedClass}/averages`, {
                credentials: 'include'
            });
            if (response.ok) {
                const data = await response.json();
                setClassAverages(data.averages || []);
            }
        }
        catch (error) {
            console.error('Error fetching class averages:', error);
        }
    };
    const fetchStudentGrades = async () => {
        try {
            const response = await fetch('/api/gradebook/grades/student', {
                credentials: 'include'
            });
            if (response.ok) {
                const data = await response.json();
                let grades = [];
                if (data.grades && Array.isArray(data.grades)) {
                    grades = data.grades.map((item) => ({
                        date: item.grade_date || item.date || '',
                        grade: typeof item.grade === 'string' ? parseFloat(item.grade) : item.grade,
                        subject_name: item.subject_name || item.name || ''
                    }));
                }
                else if (Array.isArray(data)) {
                    grades = data.map((item) => ({
                        date: item.grade_date || item.date || '',
                        grade: typeof item.grade === 'string' ? parseFloat(item.grade) : item.grade,
                        subject_name: item.subject_name || item.name || ''
                    }));
                }
                setStudentGrades(grades);
            }
        }
        catch (error) {
            console.error('Error fetching student grades:', error);
        }
    };
    const fetchStudentAverages = async () => {
        try {
            const response = await fetch('/api/gradebook/grades/average', {
                credentials: 'include'
            });
            if (response.ok) {
                const data = await response.json();
                setStudentAverages(data.averages || []);
            }
        }
        catch (error) {
            console.error('Error fetching student averages:', error);
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
        }
        catch (error) {
            console.error('Logout error:', error);
        }
    };
    const getGradeColor = (grade) => {
        if (grade >= 9)
            return '#10b981';
        if (grade >= 7)
            return '#3b82f6';
        if (grade >= 4)
            return '#f59e0b';
        return '#ef4444';
    };
    const renderGradesChart = (grades) => {
        if (grades.length === 0) {
            return _jsx("div", { className: "no-data", children: "\u041D\u0435\u0442 \u0434\u0430\u043D\u043D\u044B\u0445 \u043E\u0431 \u043E\u0446\u0435\u043D\u043A\u0430\u0445" });
        }
        const gradesBySubject = new Map();
        grades.forEach(grade => {
            if (!gradesBySubject.has(grade.subject_name)) {
                gradesBySubject.set(grade.subject_name, { dates: [], grades: [] });
            }
            const subjectData = gradesBySubject.get(grade.subject_name);
            subjectData.dates.push(grade.date);
            subjectData.grades.push(grade.grade);
        });
        const maxGrade = Math.max(...grades.map(g => g.grade), 10);
        const chartHeight = 200;
        return (_jsx("div", { className: "grades-charts", children: Array.from(gradesBySubject.entries()).map(([subjectName, data]) => (_jsxs("div", { className: "subject-chart", children: [_jsx("h3", { className: "subject-chart-title", children: subjectName }), _jsx("div", { className: "chart-container", children: data.dates.map((date, idx) => (_jsxs("div", { className: "chart-bar-container", children: [_jsx("div", { className: "chart-bar", style: {
                                        height: `${(data.grades[idx] / maxGrade) * chartHeight}px`,
                                        backgroundColor: getGradeColor(data.grades[idx])
                                    }, children: _jsx("span", { className: "chart-value", children: data.grades[idx] }) }), _jsx("div", { className: "chart-label", children: new Date(date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) })] }, idx))) })] }, subjectName))) }));
    };
    const renderAveragesTable = (averages) => {
        if (!averages || averages.length === 0) {
            return _jsx("div", { className: "no-data", children: "\u041D\u0435\u0442 \u0434\u0430\u043D\u043D\u044B\u0445 \u043E \u0441\u0440\u0435\u0434\u043D\u0438\u0445 \u0431\u0430\u043B\u043B\u0430\u0445" });
        }
        return (_jsxs("table", { className: "averages-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "\u041F\u0440\u0435\u0434\u043C\u0435\u0442" }), _jsx("th", { children: "\u0421\u0440\u0435\u0434\u043D\u0438\u0439 \u0431\u0430\u043B\u043B" }), _jsx("th", { children: "\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E \u043E\u0446\u0435\u043D\u043E\u043A" })] }) }), _jsx("tbody", { children: averages.map((avg, idx) => {
                        const averageGrade = typeof avg.average_grade === 'string'
                            ? parseFloat(avg.average_grade)
                            : avg.average_grade;
                        const displayGrade = !isNaN(averageGrade) && averageGrade > 0
                            ? averageGrade.toFixed(2)
                            : '—';
                        return (_jsxs("tr", { children: [_jsx("td", { children: avg.subject_name || '—' }), _jsx("td", { children: _jsx("span", { className: "average-grade", style: { color: getGradeColor(averageGrade || 0) }, children: displayGrade }) }), _jsx("td", { children: avg.grades_count || 0 })] }, idx));
                    }) })] }));
    };
    if (loading) {
        return (_jsx("div", { className: "profile-page", children: _jsx("div", { className: "profile-container", children: _jsx("div", { className: "profile-card", children: _jsx("div", { className: "loading-spinner", children: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430..." }) }) }) }));
    }
    if (!user) {
        return null;
    }
    return (_jsxs("div", { className: "profile-page", children: [_jsxs("div", { className: "profile-container", children: [_jsxs("div", { className: "profile-card", children: [_jsxs("div", { className: "profile-header", children: [_jsx("div", { className: "profile-avatar", children: _jsx("span", { className: "avatar-text", children: user.name?.charAt(0)?.toUpperCase() || '?' }) }), _jsx("h1", { className: "profile-title", children: user.name }), _jsx("p", { className: "profile-subtitle", children: user.email }), _jsx("div", { className: "role-badge-header", children: user.role === 'admin' ? 'Админ' : user.role === 'teacher' ? 'Учитель' : 'Студент' })] }), _jsx("div", { className: "profile-actions", children: _jsx("button", { onClick: handleLogout, className: "logout-btn", children: "\u0412\u044B\u0439\u0442\u0438 \u0438\u0437 \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u0430" }) })] }), _jsxs("div", { className: "progress-card", children: [_jsxs("div", { className: "progress-header", children: [_jsx("h2", { className: "progress-title", children: userRole != 'student' ? 'Успеваемость класса' : 'Моя успеваемость' }), (userRole === 'teacher' && teacherClasses.length > 0) && (_jsx("select", { className: "class-selector", value: selectedClass || '', onChange: (e) => setSelectedClass(Number(e.target.value)), children: teacherClasses.map((cls) => (_jsx("option", { value: cls.id, children: cls.name }, cls.id))) })), userRole === 'admin' && (_jsx("select", { className: "class-selector", value: selectedClass || '', onChange: (e) => setSelectedClass(Number(e.target.value)), children: allClasses.map((cls) => (_jsx("option", { value: cls.id, children: cls.name }, cls.id))) }))] }), _jsxs("div", { className: "progress-tabs", children: [_jsx("button", { className: `tab-btn ${activeTab === 'grades' ? 'active' : ''}`, onClick: () => setActiveTab('grades'), children: "\u0413\u0440\u0430\u0444\u0438\u043A \u043E\u0446\u0435\u043D\u043E\u043A" }), _jsx("button", { className: `tab-btn ${activeTab === 'averages' ? 'active' : ''}`, onClick: () => setActiveTab('averages'), children: "\u0421\u0440\u0435\u0434\u043D\u0438\u0435 \u0431\u0430\u043B\u043B\u044B" })] }), _jsxs("div", { className: "progress-content", children: [activeTab === 'grades' && (userRole != 'student'
                                        ? renderGradesChart(classGrades)
                                        : renderGradesChart(studentGrades)), activeTab === 'averages' && (userRole != 'student'
                                        ? renderAveragesTable(classAverages)
                                        : renderAveragesTable(studentAverages))] })] })] }), _jsx("style", { children: `
        .profile-page {
          min-height: 100vh;
          background: #f3f4f6;
          padding: 40px 20px;
        }

        .profile-container {
          max-width: 1200px;
          margin: 0 auto;
        }

        .profile-card {
          background: white;
          border-radius: 24px;
          padding: 40px 32px;
          margin-bottom: 24px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }

        .profile-header {
          text-align: center;
        }

        .profile-avatar {
          display: flex;
          justify-content: center;
          margin-bottom: 20px;
        }

        .avatar-text {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 48px;
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
          margin-bottom: 12px;
        }

        .role-badge-header {
          display: inline-block;
          padding: 6px 16px;
          background: #dbeafe;
          color: #1e40af;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 500;
        }

        .profile-actions {
          display: flex;
          justify-content: center;
          margin-top: 24px;
        }

        .logout-btn {
          padding: 10px 24px;
          background: #ef4444;
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .logout-btn:hover {
          background: #dc2626;
          transform: translateY(-2px);
        }

        .progress-card {
          background: white;
          border-radius: 24px;
          padding: 32px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }

        .progress-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          flex-wrap: wrap;
          gap: 16px;
        }

        .progress-title {
          font-size: 22px;
          font-weight: 600;
          color: #1f2937;
        }

        .class-selector {
          padding: 8px 16px;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          font-size: 14px;
          background: white;
          color: black;
          cursor: pointer;
        }

        .progress-tabs {
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
          border-bottom: 2px solid #e5e7eb;
        }

        .tab-btn {
          padding: 10px 20px;
          background: none;
          border: none;
          font-size: 16px;
          font-weight: 500;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
        }

        .tab-btn.active {
          color: #3b82f6;
        }

        .tab-btn.active::after {
          content: '';
          position: absolute;
          bottom: -2px;
          left: 0;
          right: 0;
          height: 2px;
          background: #3b82f6;
        }

        .grades-charts {
          display: flex;
          flex-direction: column;
          gap: 32px;
        }

        .subject-chart {
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 24px;
        }

        .subject-chart-title {
          font-size: 18px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 16px;
        }

        .chart-container {
          display: flex;
          gap: 12px;
          align-items: flex-end;
          overflow-x: auto;
          padding: 15px 0;
          justify-content: space-evenly;
        }

        .chart-bar-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          min-width: 60px;
        }

        .chart-bar {
          width: 40px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: height 0.3s ease;
          position: relative;
        }

        .chart-value {
          position: absolute;
          top: -20px;
          font-size: 12px;
          font-weight: 600;
          color: #374151;
        }

        .chart-label {
          font-size: 11px;
          color: #6b7280;
          text-align: center;
        }

        .averages-table {
          width: 100%;
          border-collapse: collapse;
        }

        .averages-table th,
        .averages-table td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #e5e7eb;
        }

        .averages-table th {
          font-weight: 600;
          color: #6b7280;
          font-size: 12px;
          text-transform: uppercase;
        }

        .averages-table td {
          color: #374151;
        }

        .average-grade {
          font-weight: 700;
          font-size: 18px;
        }

        .no-data {
          text-align: center;
          padding: 60px;
          color: #9ca3af;
          font-size: 16px;
        }

        .loading-spinner {
          text-align: center;
          padding: 40px;
          color: #6b7280;
        }

        @media (max-width: 768px) {
          .profile-card, .progress-card {
            padding: 24px;
          }

          .profile-title {
            font-size: 24px;
          }

          .avatar-text {
            width: 80px;
            height: 80px;
            font-size: 36px;
          }

          .progress-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .chart-bar {
            width: 30px;
          }

          .chart-bar-container {
            min-width: 45px;
          }
        }
      ` })] }));
}
export default ProfilePage;
