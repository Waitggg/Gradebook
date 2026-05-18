import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface Class {
  id: number;
  name: string;
  year: number;
}

interface Subject {
  id: number;
  name: string;
}

interface LessonTime {
  lesson_number: number;
  start_time: string;
  end_time: string;
}

interface ScheduleItem {
  id: number;
  day_of_week: number;
  lesson_number: number;
  subject_id: number;
  subject_name: string;
  teacher_id: number;
  teacher_name: string;
  room: string | null;
}

interface ApiClassResponse {
  id: number;
  name: string;
  year: number;
  created_at?: string;
}

interface ApiSubjectResponse {
  id: number;
  name: string;
  description?: string;
  created_at?: string;
}

const daysOfWeek = [
  { value: 1, name: 'Понедельник' },
  { value: 2, name: 'Вторник' },
  { value: 3, name: 'Среда' },
  { value: 4, name: 'Четверг' },
  { value: 5, name: 'Пятница' },
  { value: 6, name: 'Суббота' }
];

function SchedulePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<'teacher' | 'student' | null>(null);
  
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [lessonTimes, setLessonTimes] = useState<LessonTime[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    subject_id: 0,
    lesson_number: 1,
    day_of_week: 1,
    room: ''
  });

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      loadSchedule();
    }
  }, [selectedClass]);

const checkAuth = async () => {
  try {
    const response = await fetch('/api/auth/profile', { credentials: 'include' });
    if (response.ok) {
      const data = await response.json();
      const role = data.user.role;
      setUserRole(role);
      
      await loadClasses();
      await loadSubjects();
      await loadLessonTimes();
    } else {
      navigate('/login');
    }
  } catch (error) {
    console.error('Auth error:', error);
    navigate('/login');
  } finally {
    setLoading(false);
  }
};

  const loadClasses = async () => {
    try {
      const url = '/api/gradebook/classes';

      const response = await fetch(url, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        const classesList: ApiClassResponse[] = data.classes || [];
        const uniqueClasses: Class[] = Array.from(
          new Map(classesList.map((c: ApiClassResponse) => [c.id, { id: c.id, name: c.name, year: c.year }])).values()
        );
        setClasses(uniqueClasses);
        if (uniqueClasses.length > 0 && !selectedClass) {
          setSelectedClass(uniqueClasses[0].id);
        }
      }
    } catch (error) {
      console.error('Load classes error:', error);
    }
  };

  const loadSubjects = async () => {
    try {
      const url = '/api/gradebook/subjects';
      
      const response = await fetch(url, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        const subjectsList: ApiSubjectResponse[] = data.subjects || [];
        const uniqueSubjects: Subject[] = Array.from(
          new Map(subjectsList.map((s: ApiSubjectResponse) => [s.id, { id: s.id, name: s.name }])).values()
        );
        setSubjects(uniqueSubjects);
      }
    } catch (error) {
      console.error('Load subjects error:', error);
    }
  };

const loadSchedule = async () => {
  if (!selectedClass) return;
  try {
    const response = await fetch(`/api/gradebook/schedule/class/${selectedClass}`, { credentials: 'include' });
    if (response.ok) {
      const data = await response.json();
      setSchedule(data.schedule || []);
      setLessonTimes(data.lesson_times || []);
    }
  } catch (error) {
    console.error('Load schedule error:', error);
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

const handleAddSchedule = async (e: React.FormEvent) => {
  e.preventDefault();
  try {
    const response = await fetch('/api/gradebook/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        class_id: selectedClass,
        ...formData
      }),
      credentials: 'include'
    });
    
    if (response.ok) {
      setShowAddModal(false);
      setFormData({ subject_id: 0, lesson_number: 1, day_of_week: 1, room: '' });
      loadSchedule();
    } else {
      const error = await response.json();
      alert(error.message || 'Ошибка добавления');
    }
  } catch (error) {
    console.error('Add schedule error:', error);
    alert('Ошибка добавления');
  }
};

  const handleDeleteSchedule = async (id: number) => {
    if (!confirm('Удалить этот урок из расписания?')) return;
    try {
      const response = await fetch(`/api/schedule/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (response.ok) {
        loadSchedule();
      } else {
        alert('Ошибка удаления');
      }
    } catch (error) {
      console.error('Delete schedule error:', error);
      alert('Ошибка удаления');
    }
  };

  const getScheduleForDay = (day: number) => {
    return schedule.filter(item => item.day_of_week === day)
      .sort((a, b) => a.lesson_number - b.lesson_number);
  };

  const getLessonTime = (lessonNumber: number) => {
    const time = lessonTimes.find(lt => lt.lesson_number === lessonNumber);
    return time ? `${time.start_time.slice(0, 5)} - ${time.end_time.slice(0, 5)}` : '';
  };

  if (loading) {
    return <div className="loading">Загрузка...</div>;
  }

  return (
    <div className="schedule-container">
      <h1 className="page-title">Расписание занятий</h1>
      
      <div className="class-selector">
        <label className="filter-label">Выберите класс</label>
        <select
          className="filter-select"
          value={selectedClass || ''}
          onChange={(e) => setSelectedClass(Number(e.target.value))}
        >
          {classes.map((classItem) => (
            <option key={classItem.id} value={classItem.id}>
              {classItem.name} (выпуск {classItem.year})
            </option>
          ))}
        </select>
      </div>
      
      {userRole === 'teacher' && (
        <button className="btn-primary add-btn" onClick={() => setShowAddModal(true)}>
          + Добавить урок
        </button>
      )}
      
      <div className="schedule-grid">
        {daysOfWeek.map(day => (
          <div key={day.value} className="schedule-day">
            <h2 className="day-title">{day.name}</h2>
            <div className="schedule-lessons">
              {getScheduleForDay(day.value).map((item) => (
                <div key={item.id} className="schedule-lesson">
                  <div className="lesson-time">{getLessonTime(item.lesson_number)}</div>
                  <div className="lesson-subject">{item.subject_name}</div>
                  <div className="lesson-teacher">{item.teacher_name}</div>
                  <div className="lesson-room">Кабинет: {item.room || '—'}</div>
                  {userRole === 'teacher' && (
                    <button 
                      className="btn-delete-lesson"
                      onClick={() => handleDeleteSchedule(item.id)}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              {getScheduleForDay(day.value).length === 0 && (
                <div className="no-lessons">Нет уроков</div>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Добавить урок в расписание</h2>
            <form onSubmit={handleAddSchedule}>
              <div className="form-group">
                <label>День недели</label>
                <select
                  value={formData.day_of_week}
                  onChange={(e) => setFormData({ ...formData, day_of_week: parseInt(e.target.value) })}
                  required
                >
                  {daysOfWeek.map(day => (
                    <option key={day.value} value={day.value}>{day.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label>Номер урока</label>
                <select
                  value={formData.lesson_number}
                  onChange={(e) => setFormData({ ...formData, lesson_number: parseInt(e.target.value) })}
                  required
                >
                  {lessonTimes.map(lt => (
                    <option key={lt.lesson_number} value={lt.lesson_number}>
                      {lt.lesson_number} урок ({lt.start_time.slice(0, 5)} - {lt.end_time.slice(0, 5)})
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label>Предмет</label>
                <select
                  value={formData.subject_id}
                  onChange={(e) => setFormData({ ...formData, subject_id: parseInt(e.target.value) })}
                  required
                >
                  <option value="">Выберите предмет</option>
                  {subjects.map(subject => (
                    <option key={subject.id} value={subject.id}>{subject.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label>Кабинет</label>
                <input
                  type="text"
                  value={formData.room}
                  onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                  placeholder="Например: 201"
                />
              </div>
              
              <div className="modal-buttons">
                <button type="button" onClick={() => setShowAddModal(false)}>Отмена</button>
                <button type="submit">Сохранить</button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      <style>{`
        .schedule-container {
          padding: 24px;
          max-width: 1400px;
          margin: 0 auto;
        }
        
        .class-selector {
          margin-bottom: 20px;
          max-width: 300px;
        }
        
        .add-btn {
          margin-bottom: 24px;
        }
        
        .schedule-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 20px;
        }
        
        .schedule-day {
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        
        .day-title {
          background: #3b82f6;
          color: white;
          padding: 12px 16px;
          font-size: 16px;
          font-weight: 600;
          margin: 0;
        }
        
        .schedule-lessons {
          padding: 12px;
        }
        
        .schedule-lesson {
          background: #f9fafb;
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 8px;
          position: relative;
        }
        
        .lesson-time {
          font-size: 12px;
          color: #6b7280;
          margin-bottom: 4px;
        }
        
        .lesson-subject {
          font-weight: 600;
          font-size: 14px;
          color: #1f2937;
          margin-bottom: 4px;
        }
        
        .lesson-teacher {
          font-size: 12px;
          color: #4b5563;
        }
        
        .lesson-room {
          font-size: 12px;
          color: #6b7280;
          margin-top: 4px;
        }
        
        .btn-delete-lesson {
          position: absolute;
          top: 8px;
          right: 8px;
          background: none;
          border: none;
          color: #9ca3af;
          cursor: pointer;
          font-size: 14px;
          padding: 4px;
          border-radius: 4px;
        }
        
        .btn-delete-lesson:hover {
          background: #fee2e2;
          color: #dc2626;
        }
        
        .no-lessons {
          text-align: center;
          padding: 24px;
          color: #9ca3af;
          font-size: 14px;
        }
        
        @media (max-width: 768px) {
          .schedule-container {
            padding: 16px;
          }
          
          .schedule-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

export default SchedulePage;