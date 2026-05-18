import { useState, useEffect, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';

interface Subject {
  id: number;
  name: string;
}

interface Class {
  id: number;
  name: string;
  graduation_year: number;
  year?: number;
}

interface Student {
  id: number;
  name: string;
}

interface GradeRecord {
  id: number;
  date: string;
  grade: number | null;
  isAbsent: boolean;
}

interface StudentGrades {
  student: Student;
  grades: GradeRecord[];
}

const normalizeDate = (date?: string) => {
  if (!date) return '';
  
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }
  
  if (date.includes('T')) {
    return date.split('T')[0];
  }
  
  const parsed = new Date(date);
  if (isNaN(parsed.getTime())) return '';
  
  const year = parsed.getUTCFullYear();
  const month = String(parsed.getUTCMonth() + 1).padStart(2, '0');
  const day = String(parsed.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getMonthDates = (referenceDate: Date = new Date()) => {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  return Array.from({ length: daysInMonth }, (_, index) => {
    const date = new Date(Date.UTC(year, month, index + 1));
    return date.toISOString().split('T')[0];
  });
};

function GradebookPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<'teacher' | 'student' | null>(null);
  
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
  
  const [monthDates, setMonthDates] = useState<string[]>([]);
  const [studentsGrades, setStudentsGrades] = useState<StudentGrades[]>([]);
  
  const [editingCell, setEditingCell] = useState<{ studentId: number; date: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (userRole === 'teacher' && selectedClass && selectedSubject) {
      loadGradebookData();
    }
  }, [selectedClass, selectedSubject]);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/profile', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setUserRole(data.user.role);
        
        if (data.user.role === 'teacher') {
          await loadTeacherData();
        } else {
          await loadStudentData();
        }
      } else {
        navigate('/login');
      }
    } catch (error) {
      console.error('Auth check error:', error);
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  const loadTeacherData = async () => {
    try {
      const [subjectsRes, classesRes] = await Promise.all([
        fetch('/api/gradebook/my-subjects', { credentials: 'include' }),
        fetch('/api/gradebook/myClasses', { credentials: 'include' })
      ]);
      
      if (subjectsRes.ok) {
        const subjectsData = await subjectsRes.json();
        setSubjects(subjectsData.subjects || []);
      }
      
      if (classesRes.ok) {
        const classesData = await classesRes.json();
        setClasses(classesData.classes || []);
      }
    } catch (error) {
      console.error('Load teacher data error:', error);
    }
  };

  const loadGradebookData = async () => {
    if (!selectedClass || !selectedSubject) return;
    
    try {
      const studentsRes = await fetch(`/api/gradebook/classes/${selectedClass}/students`, {
        credentials: 'include'
      });
      
      if (!studentsRes.ok) return;
      
      const studentsData = await studentsRes.json();
      const studentsList = studentsData.students || [];
      
      const studentsWithRawRecords = await Promise.all(
        studentsList.map(async (student: Student) => {
          const gradesRes = await fetch(`/api/gradebook/grades/student/${student.id}?subject_id=${selectedSubject}`, {
            credentials: 'include'
          });
          const gradesData = await gradesRes.json();
          
          const attendanceRes = await fetch(`/api/gradebook/attendance/student/${student.id}?subject_id=${selectedSubject}`, {
            credentials: 'include'
          });
          const attendanceData = await attendanceRes.json();
          
          return {
            student,
            grades: gradesData.grades || [],
            attendance: attendanceData.attendance || []
          };
        })
      );
      
      const monthDateList = getMonthDates();
      setMonthDates(monthDateList);
      
      const studentsWithGrades = studentsWithRawRecords.map(({ student, grades, attendance }) => {  
  return {
    student,
    grades: monthDateList.map((date) => {
      const grade = grades.find((g: any) => {
        const normalized = normalizeDate(g.grade_date);
        const matches = normalized === date;
        return matches;
      });
      
      const attendanceItem = attendance.find((a: any) => {
        const normalized = normalizeDate(a.date);
        const matches = normalized === date;
        return matches;
      });
      
      return {
        id: grade?.id || attendanceItem?.id || 0,
        date,
        grade: grade?.grade ?? null,
        isAbsent: attendanceItem?.status === 'absent' || false
      };
    })
  };
});
      
      setStudentsGrades(studentsWithGrades);
    } catch (error) {
      console.error('Load gradebook error:', error);
    }
  };

const loadStudentData = async () => {
  try {
    const subjectsRes = await fetch('/api/gradebook/my-subjects', { credentials: 'include' });
    const subjectsData = await subjectsRes.json();
    
    const subjectsList = subjectsData.subjects || [];
    
    if (subjectsList.length === 0) {
      setStudentsGrades([]);
      return;
    }
    
    const monthDateList = getMonthDates();
    setMonthDates(monthDateList);
    
    const subjectsWithGrades = await Promise.all(
      subjectsList.map(async (subject: Subject) => {
        
        const gradesRes = await fetch(`/api/gradebook/grades/subject/${subject.id}`, { 
          credentials: 'include' 
        });
        const gradesData = await gradesRes.json();
        
        const attendanceRes = await fetch(`/api/gradebook/attendance/subject/${subject.id}`, { 
          credentials: 'include' 
        });
        const attendanceData = await attendanceRes.json();
        
        const gradesMap = new Map();
        (gradesData.grades || []).forEach((g: any) => {
          const normalizedDate = normalizeDate(g.grade_date);
          gradesMap.set(normalizedDate, g);
        });
        
        const attendanceMap = new Map();
        (attendanceData.attendance || []).forEach((a: any) => {
          const normalizedDate = normalizeDate(a.date);
          attendanceMap.set(normalizedDate, a);
        });
        
        const grades = monthDateList.map((date) => {
          const grade = gradesMap.get(date);
          const attendanceItem = attendanceMap.get(date);
          
          const result = {
            id: grade?.id || attendanceItem?.id || 0,
            date,
            grade: grade?.grade ?? null,
            isAbsent: attendanceItem?.status === 'absent' || false
          };
          
          return result;
        });
        
        return {
          student: { id: subject.id, name: subject.name },
          grades: grades
        };
      })
    );
    
    setStudentsGrades(subjectsWithGrades);
    
  } catch (error) {
    console.error('Load student data error:', error);
  }
};

  const handleCellDoubleClick = (studentId: number, date: string, currentValue: number | null, isAbsent: boolean) => {
    if (userRole !== 'teacher') return;
    setEditingCell({ studentId, date });
    if (isAbsent) {
      setEditValue('н');
    } else if (currentValue) {
      setEditValue(currentValue.toString());
    } else {
      setEditValue('');
    }
  };

  const handleCellSave = async () => {
  if (!editingCell || !selectedSubject) return;
  
  const { studentId, date } = editingCell;
  const value = editValue.trim();
  
  try {
    if (value === 'н' || value === 'Н') {
      await fetch('/api/gradebook/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: studentId,
          subject_id: selectedSubject,
          date,
          status: 'absent'
        }),
        credentials: 'include'
      });
    } else if (value === '') {
      await fetch('/api/gradebook/grades', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: studentId,
          subject_id: selectedSubject,
          grade_date: date
        }),
        credentials: 'include'
      });
      
      await fetch('/api/gradebook/attendance', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: studentId,
          subject_id: selectedSubject,
          date
        }),
        credentials: 'include'
      });
    } else {
      const gradeNum = parseInt(value);
      if (!isNaN(gradeNum) && gradeNum >= 1 && gradeNum <= 10) {
        await fetch('/api/gradebook/grades', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            student_id: studentId,
            subject_id: selectedSubject,
            grade: gradeNum,
            grade_date: date
          }),
          credentials: 'include'
        });
      } else {
        alert('Оценка должна быть от 1 до 10, или "н" для отметки отсутствия');
        setEditingCell(null);
        return;
      }
    }
    
    await loadGradebookData();
  } catch (error) {
    console.error('Save error:', error);
    alert('Ошибка при сохранении');
  }
  
  setEditingCell(null);
};

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleCellSave();
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
  };

  const getCellContent = (grade: number | null, isAbsent: boolean) => {
    if (isAbsent) return 'н';
    if (grade !== null) return grade.toString();
    return '';
  };

  const getCellClass = (grade: number | null, isAbsent: boolean, isEditing: boolean) => {
    if (isEditing) return 'grade-cell editing';
    if (isAbsent) return 'grade-cell absent';
    if (grade !== null) {
      if (grade >= 9) return 'grade-cell excellent';
      if (grade >= 7) return 'grade-cell good';
      if (grade >= 4) return 'grade-cell satisfactory';
      return 'grade-cell poor';
    }
    return 'grade-cell empty';
  };

  if (loading) {
    return <div className="loading">Загрузка...</div>;
  }

  if (userRole === 'teacher') {
    return (
      <div className="gradebook">
        <h1 className="gradebook-title">Классный журнал</h1>
        
        <div className="filters">
          <div className="filter-group">
            <label className="filter-label">Класс</label>
            <select
              className="filter-select"
              value={selectedClass || ''}
              onChange={(e) => setSelectedClass(Number(e.target.value))}
            >
              <option value="">Выберите класс</option>
              {classes.map((classItem) => (
                <option key={classItem.id} value={classItem.id}>
                  {classItem.name} (выпуск {classItem.graduation_year || classItem.year})
                </option>
              ))}
            </select>
          </div>
          
          <div className="filter-group">
            <label className="filter-label">Предмет</label>
            <select
              className="filter-select"
              value={selectedSubject || ''}
              onChange={(e) => setSelectedSubject(Number(e.target.value))}
              disabled={!selectedClass}
            >
              <option value="">Выберите предмет</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {selectedClass && selectedSubject && studentsGrades.length > 0 && (
          <div className="gradebook-table-wrapper">
            <table className="gradebook-table">
              <thead>
                <tr>
                  <th className="student-column">Ученик</th>
                  {monthDates.map((date, index) => (
                    <th key={index} className="date-column">
                      {new Date(date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                    </th>
                  ))}
              </tr>
              </thead>
              <tbody>
                {studentsGrades.map(({ student, grades }) => (
                  <tr key={student.id}>
                    <td className="student-cell">{student.name}</td>
                    {grades.map((gradeRecord, idx) => {
                      const isEditing = editingCell?.studentId === student.id && editingCell?.date === gradeRecord.date;
                      const content = getCellContent(gradeRecord.grade, gradeRecord.isAbsent);
                      
                      return (
                        <td
                          key={idx}
                          className={getCellClass(gradeRecord.grade, gradeRecord.isAbsent, isEditing)}
                          onDoubleClick={() => handleCellDoubleClick(student.id, gradeRecord.date, gradeRecord.grade, gradeRecord.isAbsent)}
                        >
                          {isEditing ? (
                            <input
                              type="text"
                              className="grade-input"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={handleCellSave}
                              onKeyDown={handleKeyDown}
                              autoFocus
                              maxLength={2}
                            />
                          ) : (
                            content
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        <div className="gradebook-footer">
          <div className="legend">
          </div>
          <div className="hint">
            Двойной клик по ячейке для редактирования
          </div>
        </div>
      </div>
    );
  }
  
  return (
  <div className="gradebook">
    <h1 className="gradebook-title">Мой журнал</h1>
    
    {studentsGrades.length > 0 ? (
      studentsGrades.map(({ student, grades }) => (
        <div key={student.id} className="student-subject-section">
          <h2 className="subject-title">{student.name}</h2>
          <div className="gradebook-table-wrapper">
            <table className="gradebook-table">
              <thead>
                <tr>
                  <th className="student-column">Дата</th>
                  {monthDates.map((date, index) => (
                    <th key={index} className="date-column">
                      {new Date(date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="student-cell">Оценка</td>
                  {grades.map((gradeRecord, idx) => {
                    const content = getCellContent(gradeRecord.grade, gradeRecord.isAbsent);
                    
                    return (
                      <td
                        key={idx}
                        className={getCellClass(gradeRecord.grade, gradeRecord.isAbsent, false)}
                      >
                        {content}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ))
    ) : (
      <div className="no-data">Нет данных об оценках</div>
    )}
    
    <div className="gradebook-footer">
      <div className="legend">
      </div>
    </div>
  </div>
);
}

export default GradebookPage;