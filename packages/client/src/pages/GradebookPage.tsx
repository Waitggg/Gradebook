import { useState, useEffect, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';

interface Subject {
  id: number;
  name: string;
}

interface Class {
  id: number;
  name: string;
  year?: number;
}

interface Student {
  id: number;
  name: string;
  isfired?: boolean;
}

interface GradeRecord {
  id: number;
  date: string;
  grade: number | null;
  isAbsent: boolean;
  isLate: boolean;
  lateMinutes?: number | null;
  createdTime?: string;
}

interface StudentGrades {
  student: Student;
  grades: GradeRecord[];
}

interface LessonTime {
  lesson_number: number;
  start_time: string;
  end_time: string;
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
  
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

const getMonthDatesFilteredByDays = (referenceDate: Date = new Date(), allowedDays: number[]): string[] => {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  const dates: string[] = [];
  
  for (let i = 1; i <= daysInMonth; i++) {
    const date = new Date(year, month, i);
    let jsDay = date.getDay();
    if (jsDay === 0) jsDay = 7;
    
    if (allowedDays.includes(jsDay)) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      dates.push(`${year}-${month}-${day}`);
    }
  }
  
  return dates;
};

function GradebookPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<'teacher' | 'student' | 'admin' | null>(null);
  
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
  
  const [monthDates, setMonthDates] = useState<string[]>([]);
  const [studentsGrades, setStudentsGrades] = useState<StudentGrades[]>([]);
  const [scheduleDays, setScheduleDays] = useState<number[]>([]);
  const [lessonTimes, setLessonTimes] = useState<LessonTime[]>([]);
  
  const [editingCell, setEditingCell] = useState<{ studentId: number; date: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [hoveredColumn, setHoveredColumn] = useState<number | null>(null);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null);

  const handleCellMouseEnter = (rowIndex: number, colIndex: number) => {
    setHoveredCell({ row: rowIndex, col: colIndex });
    setHoveredRow(rowIndex);
    setHoveredColumn(colIndex);
  };

  const handleCellMouseLeave = () => {
    setHoveredCell(null);
    setHoveredRow(null);
    setHoveredColumn(null);
  };

  const handleColumnMouseEnter = (index: number) => {
    setHoveredColumn(index);
  };

  const handleColumnMouseLeave = () => {
    setHoveredColumn(null);
  };

  const handleRowMouseEnter = (index: number) => {
    setHoveredRow(index);
  };

  const handleRowMouseLeave = () => {
    setHoveredRow(null);
  };

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if ((userRole === 'teacher' || userRole === 'admin') && selectedClass && selectedSubject) {
      loadTeacherGradebookData();
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
        
        if (data.user.role === 'teacher' || data.user.role === 'admin') {
          await loadTeacherData();
          await loadLessonTimes();
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

  const loadLessonTimes = async () => {
    try {
      const response = await fetch('/api/schedule/lesson-times', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setLessonTimes(data.lesson_times || []);
      }
    } catch (error) {
      console.error('Load lesson times error:', error);
    }
  };

const loadTeacherGradebookData = async () => {
  if (!selectedClass || !selectedSubject) return;
  
  try {
    const scheduleResponse = await fetch(`/api/gradebook/schedule/class/${selectedClass}`, {
      credentials: 'include'
    });
    
    let uniqueDays: number[] = [];
    let scheduleMap = new Map();
    
    if (scheduleResponse.ok) {
      const data = await scheduleResponse.json();
      const schedule = data.schedule || [];
      
      schedule.forEach((item: { day_of_week: number; subject_id: number }) => {
        if (item.subject_id === selectedSubject) {
          if (!scheduleMap.has(item.day_of_week)) {
            scheduleMap.set(item.day_of_week, []);
          }
          scheduleMap.get(item.day_of_week).push(item);
        }
      });
      
      uniqueDays = [...scheduleMap.keys()];
      setScheduleDays(uniqueDays);
    }
    
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    const startDate = `${startOfMonth.getFullYear()}-${String(startOfMonth.getMonth() + 1).padStart(2, '0')}-${String(startOfMonth.getDate()).padStart(2, '0')}`;
    const endDate = `${endOfMonth.getFullYear()}-${String(endOfMonth.getMonth() + 1).padStart(2, '0')}-${String(endOfMonth.getDate()).padStart(2, '0')}`;
    
    const changesResponse = await fetch(
      `/api/gradebook/changes/class/${selectedClass}/subject/${selectedSubject}?start=${startDate}&end=${endDate}`,
      { credentials: 'include' }
    );
    
    let changeDates: string[] = [];
    let changesMap = new Map();
    
    if (changesResponse.ok) {
      const changesData = await changesResponse.json();
      const changes = changesData.changes || [];
      
      changes.forEach((change: any) => {
        const changeDate = normalizeDate(change.date);
        changeDates.push(changeDate);
        
        if (!changesMap.has(changeDate)) {
          changesMap.set(changeDate, []);
        }
        changesMap.get(changeDate).push(change);
      });
    }
    
    const regularMonthDates = getMonthDatesFilteredByDays(now, uniqueDays.length > 0 ? uniqueDays : [1, 2, 3, 4, 5, 6]);
    
    const allDatesSet = new Set([...regularMonthDates, ...changeDates]);
    const monthDateList = Array.from(allDatesSet).sort();
    
    setMonthDates(monthDateList);
    
    const studentsRes = await fetch(`/api/gradebook/classes/${selectedClass}/students`, {
      credentials: 'include'
    });
    
    if (!studentsRes.ok) return;
    
    const studentsData = await studentsRes.json();
    const studentsList = studentsData.students || [];

    const studentsWithRawRecords = await Promise.all(
      studentsList.map(async (student: Student) => {
        const [gradesRes, attendanceRes] = await Promise.all([
          fetch(`/api/gradebook/grades/student/${student.id}?subject_id=${selectedSubject}`, {
            credentials: 'include'
          }),
          fetch(`/api/gradebook/attendance/student/${student.id}?subject_id=${selectedSubject}`, {
            credentials: 'include'
          })
        ]);
        
        const gradesData = await gradesRes.json();
        const attendanceData = await attendanceRes.json();
        
        return {
          student: { ...student, isfired: student.isfired || false },
          grades: gradesData.grades || [],
          attendance: attendanceData.attendance || []
        };
      })
    );
    
    const studentsWithGrades = studentsWithRawRecords.map(({ student, grades, attendance }) => {
      return {
        student,
        grades: monthDateList.map((date) => {
          const grade = grades.find((g: any) => normalizeDate(g.grade_date) === date);
          const attendanceItem = attendance.find((a: any) => normalizeDate(a.date) === date);
          
          return {
            id: grade?.id || attendanceItem?.id || 0,
            date,
            grade: grade?.grade ?? null,
            isAbsent: attendanceItem?.status === 'absent' || false,
            isLate: attendanceItem?.status === 'late' || false
          };
        })
      };
    });
    
    setStudentsGrades(studentsWithGrades);
  } catch (error) {
    console.error('Load teacher gradebook error:', error);
  }
};
const findClosestLesson = (createdTime: string, lessonTimes: LessonTime[], scheduleForDay?: any[]): { lesson: LessonTime, lateMinutes: number } | null => {
  if (!lessonTimes.length) return null;
  
  const [createdHour, createdMinute] = createdTime.split(':').map(Number);
  const createdTotalMinutes = createdHour * 60 + createdMinute;
  
  if (scheduleForDay && scheduleForDay.length > 0) {
    let closestScheduleItem: any = null;
    let minDifference = Infinity;
    
    for (const item of scheduleForDay) {
      const lesson = lessonTimes.find(lt => lt.lesson_number === item.lesson_number);
      if (lesson) {
        const [startHour, startMinute] = lesson.start_time.split(':').map(Number);
        const startTotalMinutes = startHour * 60 + startMinute;
        
        if (createdTotalMinutes >= startTotalMinutes) {
          const difference = createdTotalMinutes - startTotalMinutes;
          if (difference < minDifference && difference <= 25) {
            minDifference = difference;
            closestScheduleItem = item;
          }
        }
      }
    }
    
    if (closestScheduleItem && minDifference > 0) {
      const lesson = lessonTimes.find(lt => lt.lesson_number === closestScheduleItem.lesson_number);
      return { lesson: lesson!, lateMinutes: minDifference };
    }
  }
  
  let closestLesson: LessonTime | null = null;
  let minDifference = Infinity;
  
  for (const lesson of lessonTimes) {
    const [startHour, startMinute] = lesson.start_time.split(':').map(Number);
    const startTotalMinutes = startHour * 60 + startMinute;
    
    if (createdTotalMinutes >= startTotalMinutes) {
      const difference = createdTotalMinutes - startTotalMinutes;
      if (difference < minDifference && difference <= 25) {
        minDifference = difference;
        closestLesson = lesson;
      }
    }
  }
  
  if (closestLesson && minDifference > 0) {
    return { lesson: closestLesson, lateMinutes: minDifference };
  }
  
  return null;
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
    
    const lessonTimesRes = await fetch('/api/schedule/lesson-times', { credentials: 'include' });
    let lessonTimesList: LessonTime[] = [];
    if (lessonTimesRes.ok) {
      const lessonTimesData = await lessonTimesRes.json();
      lessonTimesList = lessonTimesData.lesson_times || [];
      setLessonTimes(lessonTimesList);
    }
    
    const subjectsWithGrades = await Promise.all(
      subjectsList.map(async (subject: Subject) => {
        const [gradesRes, attendanceRes] = await Promise.all([
          fetch(`/api/gradebook/grades/subject/${subject.id}`, { credentials: 'include' }),
          fetch(`/api/gradebook/attendance/subject/${subject.id}`, { credentials: 'include' })
        ]);
        
        const gradesData = await gradesRes.json();
        const attendanceData = await attendanceRes.json();
        
        const gradesMap = new Map();
        (gradesData.grades || []).forEach((g: any) => {
          const normalizedDate = normalizeDate(g.grade_date);
          gradesMap.set(normalizedDate, g);
        });
        
        const attendanceMap = new Map();
        (attendanceData.attendance || []).forEach((a: any) => {
          const normalizedDate = normalizeDate(a.date);
          attendanceMap.set(normalizedDate, {
            status: a.status,
            createdTime: a.created_time
          });
        });
        
        const monthDateList = getMonthDatesFilteredByDays(new Date(), [1, 2, 3, 4, 5, 6]);
        setMonthDates(monthDateList);
        
        const grades = monthDateList.map((date) => {
          const grade = gradesMap.get(date);
          const attendanceItem = attendanceMap.get(date);
          
          let isLate = attendanceItem?.status === 'late' || false;
          let lateMinutes = null;
          
          if (isLate && attendanceItem?.createdTime) {
            const closest = findClosestLesson(attendanceItem.createdTime, lessonTimesList);
            if (closest) {
              lateMinutes = closest.lateMinutes;
            }
          }
          
          return {
            id: grade?.id || attendanceItem?.id || 0,
            date,
            grade: grade?.grade ?? null,
            isAbsent: attendanceItem?.status === 'absent' || false,
            isLate: isLate,
            lateMinutes: lateMinutes
          };
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
  const updateCellValue = async (studentId: number, date: string, type: 'grade' | 'absent' | 'late' | 'clear', value?: string) => {
    if (!selectedSubject) return;
    
    try {
      if (type === 'absent') {
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
      } else if (type === 'late') {
        await fetch('/api/gradebook/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            student_id: studentId,
            subject_id: selectedSubject,
            date,
            status: 'late'
          }),
          credentials: 'include'
        });
      } else if (type === 'grade' && value) {
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
        }
      } else if (type === 'clear') {
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
      }
      
      await loadTeacherGradebookData();
    } catch (error) {
      console.error('Update error:', error);
      alert('Ошибка при сохранении');
    }
  };

  const handleCellClick = (studentId: number, date: string, currentValue: number | null, isAbsent: boolean, isLate: boolean) => {
    if (userRole !== 'teacher') return;
    
    if (currentValue !== null || isAbsent || isLate) {
      updateCellValue(studentId, date, 'clear');
    } else {
      setEditingCell({ studentId, date });
      setEditValue('');
    }
  };

  const handleCellContextMenu = async (e: React.MouseEvent, studentId: number, date: string, isAbsent: boolean) => {
    e.preventDefault();
    if (userRole !== 'teacher') return;
    
    if (isAbsent) {
      await updateCellValue(studentId, date, 'clear');
    } else {
      await updateCellValue(studentId, date, 'absent');
    }
  };

  const handleCellMiddleClick = async (e: React.MouseEvent, studentId: number, date: string, isLate: boolean) => {
    e.preventDefault();
    if (userRole !== 'teacher') return;
    
    if (isLate) {
      await updateCellValue(studentId, date, 'clear');
    } else {
      await updateCellValue(studentId, date, 'late');
    }
  };

  const handleCellSave = async () => {
    if (!editingCell || !selectedSubject) return;
    
    const { studentId, date } = editingCell;
    const value = editValue.trim();
    
    if (value && !isNaN(parseInt(value)) && parseInt(value) >= 1 && parseInt(value) <= 10) {
      await updateCellValue(studentId, date, 'grade', value);
    } else if (value === 'н' || value === 'Н') {
      await updateCellValue(studentId, date, 'absent');
    } else if (value === 'о' || value === 'О') {
      await updateCellValue(studentId, date, 'late');
    } else if (value !== '') {
      alert('Оценка должна быть от 1 до 10, "н" для отсутствия или "о" для опоздания');
      setEditingCell(null);
      return;
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

  const getCellContent = (grade: number | null, isAbsent: boolean, isLate: boolean, lateMinutes?: number | null) => {
    if (isAbsent) return 'н';
    if (isLate)
    {
      if (lateMinutes && lateMinutes > 0) {
      return `о (${lateMinutes})`;
    }
    return 'о';
    }
    if (grade !== null) return grade.toString();
    return '';
  };

  const getCellClass = (grade: number | null, isAbsent: boolean, isLate: boolean, isEditing: boolean) => {
    if (isEditing) return 'grade-cell editing';
    if (isAbsent) return 'grade-cell absent';
    if (isLate) return 'grade-cell late';
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

  if (userRole === 'teacher' || userRole === 'admin') {
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
                  {classItem.name} (выпуск {classItem.year})
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
        
{selectedClass && selectedSubject && monthDates.length > 0 && studentsGrades.length > 0 && (
  <div className="gradebook-table-wrapper">
    <table className="gradebook-table">
      <thead>
        <tr>
          <th className="index-column">Номер</th>
          <th className="student-column">Ученик</th>
          {monthDates.map((date, index) => (
            <th 
              key={index} 
              className={`date-column ${hoveredColumn === index ? 'column-hover' : ''} ${hoveredCell?.col === index ? 'column-hover' : ''}`}
              title={date}
              onMouseEnter={() => handleColumnMouseEnter(index)}
              onMouseLeave={handleColumnMouseLeave}
            >
              {new Date(date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {studentsGrades.map(({ student, grades }, studentIndex) => (
          <tr key={student.id} 
          className={`${student.isfired ? 'fired-student' : ''} ${hoveredRow === studentIndex ? 'row-hover' : ''} ${hoveredCell?.row === studentIndex ? 'row-hover' : ''}`}
          onMouseEnter={() => handleRowMouseEnter(studentIndex)}
          onMouseLeave={handleRowMouseLeave}   >
            <td className="student-index-cell">{studentIndex+1}</td>
            <td className="student-cell">{student.name}</td>
            {grades.map((gradeRecord, idx) => {
              const isEditing = editingCell?.studentId === student.id && editingCell?.date === gradeRecord.date;
              const content = getCellContent(gradeRecord.grade, gradeRecord.isAbsent, gradeRecord.isLate, gradeRecord.lateMinutes);
              const isColumnHovered = hoveredColumn === idx;
              const isCellHovered = hoveredCell?.row === studentIndex && hoveredCell?.col === idx;
              
              return (
                <td
                  key={idx}
                  className={`${getCellClass(gradeRecord.grade, gradeRecord.isAbsent, gradeRecord.isLate, isEditing)} ${isColumnHovered ? 'column-hover' : ''} ${isCellHovered ? 'column-hover' : ''}`}
                  onMouseEnter={() => handleCellMouseEnter(studentIndex, idx)}
                  onMouseLeave={handleCellMouseLeave}
                  onClick={() => handleCellClick(student.id, gradeRecord.date, gradeRecord.grade, gradeRecord.isAbsent, gradeRecord.isLate)}
                  onContextMenu={(e) => handleCellContextMenu(e, student.id, gradeRecord.date, gradeRecord.isAbsent)}
                  onAuxClick={(e) => {
                    if (e.button === 1) {
                      handleCellMiddleClick(e, student.id, gradeRecord.date, gradeRecord.isLate);
                    }
                  }}
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
            <span className="legend-title">Условные обозначения:</span>
            <div className="legend-items">
              <span className="legend-excellent">9-10</span>
              <span className="legend-good">7-8</span>
              <span className="legend-satisfactory">4-6</span>
              <span className="legend-poor">1-3</span>
              <span className="legend-absent">н (отсутствие)</span>
              <span className="legend-late">о (опоздание)</span>
              <span className="legend-empty">-</span>
            </div>
          </div>
          <div className="hint">
            Левая кнопка - ввод оценки | Правая кнопка - отсутствие (н) | Средняя кнопка - опоздание (о)
          </div>
        </div>
        
      <style>{`
      
      
  .gradebook {
    padding: 24px;
    max-width: 1400px;
    margin: 0 auto;
  }
  
  .gradebook-title {
    font-size: 24px;
    font-weight: 600;
    color: #1f2937;
    margin-bottom: 24px;
  }
  
  .filters {
    display: flex;
    gap: 20px;
    margin-bottom: 24px;
    flex-wrap: wrap;
  }
  
  .filter-group {
    flex: 1;
    min-width: 200px;
  }
  
  .filter-label {
    display: block;
    font-size: 14px;
    font-weight: 500;
    color: #374151;
    margin-bottom: 6px;
  }
  
  .filter-select {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 14px;
    background: white;
    color: #1f2937;
  }
  
  .filter-select option {
    background: white;
    color: #1f2937;
  }
  
  .filter-select:disabled {
    background: #f9fafb;
    color: #9ca3af;
  }
  
  .gradebook-table-wrapper {
    overflow-x: auto;
    border-radius: 12px;
    border: 1px solid #e5e7eb;
  }
  
  .gradebook-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
    min-width: 600px;
  }
  
  .gradebook-table th {
    background: #f3f4f6;
    padding: 12px 8px;
    text-align: center;
    font-weight: 600;
    color: #374151;
    border-bottom: 1px solid #e5e7eb;
    position: sticky;
    top: 0;
  }
  
  .gradebook-table td {
    padding: 8px;
    text-align: center;
    border-bottom: 1px solid #f0f0f0;
  }
  
  .student-column, .subject-column {
    position: sticky;
    left: 0;
    background: white;
    font-weight: 500;
    text-align: left;
    min-width: 75px;
  }
  
  .index-column, .subject-column {
    position: sticky;
    left: 0;
    background: white;
    font-weight: 500;
    text-align: left;
    min-width: 50px;
  }

  .student-cell, .subject-cell {
    background: white;
    font-weight: 500;
    text-align: left;
    border-right: 1px solid #e5e7eb;
  }

    .student-index-cell, .subject-cell {
    background: white;
    font-weight: 500;
    text-align: center;
    border-right: 1px solid #e5e7eb;
  }
  
  .date-column {
    min-width: 60px;
  }
  
  .grade-cell {
    cursor: pointer;
    transition: background 0.2s;
    font-weight: 500;
    pointer-events: auto;
  }
  
  .grade-cell:hover {
    background: #f3f4f6;
  }
  
  .grade-cell.editing {
    padding: 0;
  }
  
  .grade-cell.excellent {
    background: #dcfce7;
    color: #166534;
  }
  
  .grade-cell.good {
    background: #dbeafe;
    color: #1e40af;
  }
  
  .grade-cell.satisfactory {
    background: #fef3c7;
    color: #92400e;
  }
  
  .grade-cell.poor {
    background: #fee2e2;
    color: #991b1b;
  }
  
  .grade-cell.absent {
    background: #f3f4f6;
    color: #6b7280;
  }
  
  .grade-cell.late {
    background: #fed7aa;
    color: #c2410c;
  }
  
  .grade-cell.empty {
    background: white;
    color: #9ca3af;
  }
  
  .grade-input {
    width: 50px;
    padding: 8px;
    text-align: center;
    border: 2px solid #3b82f6;
    border-radius: 6px;
    font-size: 14px;
    outline: none;
    background: white;
    color: #1f2937;
  }
  
  .gradebook-footer {
    margin-top: 24px;
    padding-top: 16px;
    border-top: 1px solid #e5e7eb;
  }
  
  .legend {
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
  }
  
  .legend-title {
    font-size: 14px;
    color: #6b7280;
  }
  
  .legend-items {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }
  
  .legend-items span {
    font-size: 12px;
    padding: 4px 8px;
    border-radius: 4px;
  }
  
  .legend-excellent { background: #dcfce7; color: #166534; }
  .legend-good { background: #dbeafe; color: #1e40af; }
  .legend-satisfactory { background: #fef3c7; color: #92400e; }
  .legend-poor { background: #fee2e2; color: #991b1b; }
  .legend-absent { background: #f3f4f6; color: #6b7280; }
  .legend-late { background: #fed7aa; color: #c2410c; }
  .legend-empty { background: white; color: #9ca3af; border: 1px solid #e5e7eb; }
  
  .hint {
    margin-top: 16px;
    font-size: 12px;
    color: #9ca3af;
    text-align: center;
  }

  .fired-student{
        color: #991b1b;
        background: #fee2e2;
  }
  
  .no-data {
    text-align: center;
    padding: 48px;
    color: #9ca3af;
    background: white;
    border-radius: 12px;
  }
  
  .loading {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 200px;
    font-size: 16px;
    color: #6b7280;
  }
  
  @media (max-width: 768px) {
    .gradebook {
      padding: 16px;
    }
    
    .filters {
      flex-direction: column;
      gap: 12px;
    }
    
    .student-column, .subject-column {
      min-width: 120px;
    }
    
    .date-column {
      min-width: 50px;
    }
  }
`}</style>
      </div>
    );
  }
  
  return (
    <div className="gradebook">
      <h1 className="gradebook-title">Мой журнал</h1>
      
      {studentsGrades.length > 0 && monthDates.length > 0 ? (
        <div className="gradebook-table-wrapper">
          <table className="gradebook-table">
            <thead>
              <tr>
                <th className="subject-column">Предмет</th>
                {monthDates.map((date, index) => (
                  <th key={index} 
                      className={`date-column ${hoveredCell?.col === index ? 'column-hover' : ''}`}
                      title={date}>
                    {new Date(date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {studentsGrades.map(({ student, grades }) => (
                <tr key={student.id}>
                  <td className="subject-cell">{student.name}</td>
                  {grades.map((gradeRecord, idx) => {
                    const content = getCellContent(gradeRecord.grade, gradeRecord.isAbsent, gradeRecord.isLate, gradeRecord.lateMinutes);
                    
                    return (
                      <td
                        key={idx}
                        className={getCellClass(gradeRecord.grade, gradeRecord.isAbsent, gradeRecord.isLate, false)}
                      >
                        {content}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="no-data">Нет данных об оценках</div>
      )}
      
      <div className="gradebook-footer">
        <div className="legend">
          <span className="legend-title">Условные обозначения:</span>
          <div className="legend-items">
            <span className="legend-excellent">9-10</span>
            <span className="legend-good">7-8</span>
            <span className="legend-satisfactory">4-6</span>
            <span className="legend-poor">1-3</span>
            <span className="legend-absent">н (отсутствие)</span>
            <span className="legend-late">о (опоздание)</span>
            <span className="legend-empty">-</span>
          </div>
        </div>
      </div>
      
      <style>{`
  .gradebook {
    padding: 24px;
    max-width: 1400px;
    margin: 0 auto;
  }
  
  .gradebook-title {
    font-size: 24px;
    font-weight: 600;
    color: #1f2937;
    margin-bottom: 24px;
  }
  
  .filters {
    display: flex;
    gap: 20px;
    margin-bottom: 24px;
    flex-wrap: wrap;
  }
  
  .filter-group {
    flex: 1;
    min-width: 200px;
  }
  
  .filter-label {
    display: block;
    font-size: 14px;
    font-weight: 500;
    color: #374151;
    margin-bottom: 6px;
  }
  
  .filter-select {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 14px;
    background: white;
    color: #1f2937;
  }
  
  .filter-select option {
    background: white;
    color: #1f2937;
  }
  
  .filter-select:disabled {
    background: #f9fafb;
    color: #9ca3af;
  }
  
  .gradebook-table-wrapper {
    overflow-x: auto;
    border-radius: 12px;
    border: 1px solid #e5e7eb;
  }
  
  .gradebook-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
    min-width: 600px;
  }
  
  .gradebook-table th {
    background: #f3f4f6;
    padding: 12px 8px;
    text-align: center;
    font-weight: 600;
    color: #374151;
    border-bottom: 1px solid #e5e7eb;
    position: sticky;
    top: 0;
  }
  
  .gradebook-table td {
    padding: 8px;
    text-align: center;
    border-bottom: 1px solid #f0f0f0;
  }
  
  .student-column, .subject-column {
    position: sticky;
    left: 0;
    background: white;
    font-weight: 500;
    text-align: left;
    min-width: 150px;
  }
  
  .date-column {
    min-width: 60px;
  }
  
  .grade-cell {
    cursor: pointer;
    transition: background 0.2s;
    font-weight: 500;
    pointer-events: auto;
  }
  
  .grade-cell:hover {
    background: #f3f4f6;
  }
  
  .grade-cell.editing {
    padding: 0;
  }
  
  .grade-cell.excellent {
    background: #dcfce7;
    color: #166534;
  }
  
  .grade-cell.good {
    background: #dbeafe;
    color: #1e40af;
  }
  
  .grade-cell.satisfactory {
    background: #fef3c7;
    color: #92400e;
  }
  
  .grade-cell.poor {
    background: #fee2e2;
    color: #991b1b;
  }
  
  .grade-cell.absent {
    background: #f3f4f6;
    color: #6b7280;
  }
  
  .grade-cell.late {
    background: #fed7aa;
    color: #c2410c;
  }
  
  .grade-cell.empty {
    background: white;
    color: #9ca3af;
  }
  
  .grade-input {
    width: 50px;
    padding: 8px;
    text-align: center;
    border: 2px solid #3b82f6;
    border-radius: 6px;
    font-size: 14px;
    outline: none;
    background: white;
    color: #1f2937;
  }
  
  .gradebook-footer {
    margin-top: 24px;
    padding-top: 16px;
    border-top: 1px solid #e5e7eb;
  }
  
  .legend {
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
  }
  
  .legend-title {
    font-size: 14px;
    color: #6b7280;
  }
  
  .legend-items {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }
  
  .legend-items span {
    font-size: 12px;
    padding: 4px 8px;
    border-radius: 4px;
  }
  
  .legend-excellent { background: #dcfce7; color: #166534; }
  .legend-good { background: #dbeafe; color: #1e40af; }
  .legend-satisfactory { background: #fef3c7; color: #92400e; }
  .legend-poor { background: #fee2e2; color: #991b1b; }
  .legend-absent { background: #f3f4f6; color: #6b7280; }
  .legend-late { background: #fed7aa; color: #c2410c; }
  .legend-empty { background: white; color: #9ca3af; border: 1px solid #e5e7eb; }
  
  .hint {
    margin-top: 16px;
    font-size: 12px;
    color: #9ca3af;
    text-align: center;
  }
  
  .no-data {
    text-align: center;
    padding: 48px;
    color: #9ca3af;
    background: white;
    border-radius: 12px;
  }
  
  .loading {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 200px;
    font-size: 16px;
    color: #6b7280;
  }
  
  @media (max-width: 768px) {
    .gradebook {
      padding: 16px;
    }
    
    .filters {
      flex-direction: column;
      gap: 12px;
    }
    
    .student-column, .subject-column {
      min-width: 120px;
    }
    
    .date-column {
      min-width: 50px;
    }
  }
`}</style>
    </div>
  );
}

export default GradebookPage;