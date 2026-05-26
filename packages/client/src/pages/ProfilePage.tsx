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

interface Class {
  id: number;
  name: string;
  year: number;
}

interface Subject {
  id: number;
  name: string;
}

interface GradeData {
  date: string;
  grade: number;
  subject_name: string;
}

interface SubjectAverage {
  subject_name: string;
  average_grade: number;
  grades_count: number;
}

function ProfilePage({ onLogout }: ProfilePageProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const navigate = useNavigate();
  
  const [teacherClasses, setTeacherClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  const [classGrades, setClassGrades] = useState<GradeData[]>([]);
  const [classAverages, setClassAverages] = useState<SubjectAverage[]>([]);
  
  const [studentGrades, setStudentGrades] = useState<GradeData[]>([]);
  const [studentAverages, setStudentAverages] = useState<SubjectAverage[]>([]);
  
  const [activeTab, setActiveTab] = useState<'grades' | 'averages'>('grades');

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    if (userRole === 'teacher' && selectedClass) {
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
        } else {
          await fetchStudentGrades();
          await fetchStudentAverages();
        }
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
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchClassGrades = async () => {
    if (!selectedClass) return;
    try {
      const response = await fetch(`/api/gradebook/classes/${selectedClass}/grades`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setClassGrades(data.grades || []);
      }
    } catch (error) {
      console.error('Error fetching class grades:', error);
    }
  };

  const fetchClassAverages = async () => {
    if (!selectedClass) return;
    try {
      const response = await fetch(`/api/gradebook/classes/${selectedClass}/averages`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setClassAverages(data.averages || []);
      }
    } catch (error) {
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
      
      let grades: GradeData[] = [];
      
      if (data.grades && Array.isArray(data.grades)) {
        grades = data.grades.map((item: any) => ({
          date: item.grade_date || item.date || '',
          grade: typeof item.grade === 'string' ? parseFloat(item.grade) : item.grade,
          subject_name: item.subject_name || item.name || ''
        }));
      } else if (Array.isArray(data)) {
        grades = data.map((item: any) => ({
          date: item.grade_date || item.date || '',
          grade: typeof item.grade === 'string' ? parseFloat(item.grade) : item.grade,
          subject_name: item.subject_name || item.name || ''
        }));
      }
      setStudentGrades(grades);
    }
  } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const getGradeColor = (grade: number) => {
    if (grade >= 9) return '#10b981';
    if (grade >= 7) return '#3b82f6';
    if (grade >= 4) return '#f59e0b';
    return '#ef4444';
  };

  const renderGradesChart = (grades: GradeData[]) => {
    if (grades.length === 0) {
      return <div className="no-data">Нет данных об оценках</div>;
    }

    const gradesBySubject = new Map<string, { dates: string[]; grades: number[] }>();
    grades.forEach(grade => {
      if (!gradesBySubject.has(grade.subject_name)) {
        gradesBySubject.set(grade.subject_name, { dates: [], grades: [] });
      }
      const subjectData = gradesBySubject.get(grade.subject_name)!;
      subjectData.dates.push(grade.date);
      subjectData.grades.push(grade.grade);
    });

    const maxGrade = Math.max(...grades.map(g => g.grade), 10);
    const chartHeight = 200;

    return (
      <div className="grades-charts">
        {Array.from(gradesBySubject.entries()).map(([subjectName, data]) => (
          <div key={subjectName} className="subject-chart">
            <h3 className="subject-chart-title">{subjectName}</h3>
            <div className="chart-container">
              {data.dates.map((date, idx) => (
                <div key={idx} className="chart-bar-container">
                  <div 
                    className="chart-bar"
                    style={{
                      height: `${(data.grades[idx] / maxGrade) * chartHeight}px`,
                      backgroundColor: getGradeColor(data.grades[idx])
                    }}
                  >
                    <span className="chart-value">{data.grades[idx]}</span>
                  </div>
                  <div className="chart-label">
                    {new Date(date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

const renderAveragesTable = (averages: SubjectAverage[]) => {
  if (!averages || averages.length === 0) {
    return <div className="no-data">Нет данных о средних баллах</div>;
  }

  return (
    <table className="averages-table">
      <thead>
        <tr>
          <th>Предмет</th>
          <th>Средний балл</th>
          <th>Количество оценок</th>
        </tr>
      </thead>
      <tbody>
        {averages.map((avg, idx) => {
          const averageGrade = typeof avg.average_grade === 'string' 
            ? parseFloat(avg.average_grade) 
            : avg.average_grade;
          
          const displayGrade = !isNaN(averageGrade) && averageGrade > 0 
            ? averageGrade.toFixed(2) 
            : '—';
          
          return (
            <tr key={idx}>
              <td>{avg.subject_name || '—'}</td>
              <td>
                <span 
                  className="average-grade" 
                  style={{ color: getGradeColor(averageGrade || 0) }}
                >
                  {displayGrade}
                </span>
               </td>
              <td>{avg.grades_count || 0}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
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
            <h1 className="profile-title">{user.name}</h1>
            <p className="profile-subtitle">{user.email}</p>
            <div className="role-badge-header">
              {user.role === 'teacher' ? 'Учитель' : 'Студент'}
            </div>
          </div>

          <div className="profile-actions">
            <button onClick={handleLogout} className="logout-btn">
              Выйти из аккаунта
            </button>
          </div>
        </div>

        <div className="progress-card">
          <div className="progress-header">
            <h2 className="progress-title">
              {userRole === 'teacher' ? 'Успеваемость класса' : 'Моя успеваемость'}
            </h2>
            {userRole === 'teacher' && teacherClasses.length > 0 && (
              <select
                className="class-selector"
                value={selectedClass || ''}
                onChange={(e) => setSelectedClass(Number(e.target.value))}
              >
                {teacherClasses.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="progress-tabs">
            <button
              className={`tab-btn ${activeTab === 'grades' ? 'active' : ''}`}
              onClick={() => setActiveTab('grades')}
            >
              График оценок
            </button>
            <button
              className={`tab-btn ${activeTab === 'averages' ? 'active' : ''}`}
              onClick={() => setActiveTab('averages')}
            >
              Средние баллы
            </button>
          </div>

          <div className="progress-content">
            {activeTab === 'grades' && (
              userRole === 'teacher'
                ? renderGradesChart(classGrades)
                : renderGradesChart(studentGrades)
            )}
            {activeTab === 'averages' && (
              userRole === 'teacher'
                ? renderAveragesTable(classAverages)
                : renderAveragesTable(studentAverages)
            )}
          </div>
        </div>
      </div>

      <style>{`
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
      `}</style>
    </div>
  );
}

export default ProfilePage;