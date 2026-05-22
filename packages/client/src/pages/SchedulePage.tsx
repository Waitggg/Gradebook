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
  class_id: number;
  class_name: string;
  room: string | null;
  is_canceled?: boolean;
  is_changed?: boolean;
  is_added?: boolean;
  change_type?: string;
  original_subject?: string;
  original_teacher?: string;
  notes?: string;
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
    class_id: 0,
    room: ''
  });
  const [showChangeModal, setShowChangeModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const [changeData, setChangeData] = useState({
    subject_id: 0,
    lesson_number: 1,
    room: '',
    change_type: 'replace' as 'replace' | 'cancel' | 'added',
    notes: ''
  });


  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
  if (userRole === 'teacher' && selectedClass && selectedDate) {
    loadTeacherSchedule();
  }
}, [selectedClass, selectedDate, userRole]);

  useEffect(() => {
    if (userRole === 'student' && selectedClass) {
      loadStudentSchedule();
    }
  }, [selectedClass, userRole]);


const loadTeacherSchedule = async () => {
  if (!selectedClass) return;
  try {
    const response = await fetch(`/api/schedule/class/${selectedClass}/week/${selectedDate}`, {
      credentials: 'include'
    });
    if (response.ok) {
      const data = await response.json();
      console.log('Week schedule:', data.week_schedule);
      
      const allLessons: ScheduleItem[] = [];
      data.week_schedule?.forEach((day: any) => {
        day.lessons.forEach((lesson: any) => {
          allLessons.push({
            ...lesson,
            day_of_week: day.day_of_week,
            class_name: data.class_info?.name || '',
            class_id: selectedClass
          });
        });
      });
      
      setSchedule(allLessons);
      if (data.lesson_times && data.lesson_times.length > 0) {
        setLessonTimes(data.lesson_times);
      }
    }
  } catch (error) {
    console.error('Load teacher schedule error:', error);
  }
};

const loadStudentSchedule = async () => {
  if (!selectedClass) return;
  try {
    const response = await fetch(`/api/schedule/class/${selectedClass}/week/${selectedDate}`, {
      credentials: 'include' 
    });
    if (response.ok) {
      const data = await response.json();
      console.log('Week schedule:', data.week_schedule);
      
      const allLessons: ScheduleItem[] = [];
      data.week_schedule?.forEach((day: any) => {
        day.lessons.forEach((lesson: any) => {
          allLessons.push({
            ...lesson,
            day_of_week: day.day_of_week,
            class_name: data.class_info?.name || '',
            class_id: selectedClass
          });
        });
      });

            setSchedule(allLessons);
      if (data.lesson_times && data.lesson_times.length > 0) {
        setLessonTimes(data.lesson_times);
      }
    }
  } catch (error) {
    console.error('Load student schedule error:', error);
  }
};

const loadTeacherClasses = async () => {
  try {
    const response = await fetch('/api/gradebook/myClasses', { credentials: 'include' });
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
    console.error('Load teacher classes error:', error);
  }
};

const handleAddChange = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!selectedClass) return;
  
  try {
      console.log('selectedClass:', selectedClass);

    const response = await fetch('/api/schedule/changes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        class_id: selectedClass,
        subject_id: changeData.subject_id,
        lesson_number: changeData.lesson_number,
        date: selectedDate,
        room: changeData.room,
        change_type: changeData.change_type,
        notes: changeData.notes
      }),
      credentials: 'include'
    });
    
    if (response.ok) {
      setShowChangeModal(false);
      setChangeData({ subject_id: 0, lesson_number: 1, room: '', change_type: 'replace', notes: '' });
      loadTeacherSchedule();
      alert('Изменение успешно добавлено');
    } else {
      const error = await response.json();
      alert(error.message || 'Ошибка добавления изменения');
    }
  } catch (error) {
    console.error('Add change error:', error);
    alert('Ошибка добавления изменения');
  }
};

const handleDeleteChange = async (changeId: number) => {
  if (!confirm('Удалить это изменение?')) return;
  try {
    const response = await fetch(`/api/schedule/changes/${changeId}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    
    if (response.ok) {
      loadTeacherSchedule();
      alert('Изменение удалено');
    } else {
      alert('Ошибка удаления');
    }
  } catch (error) {
    console.error('Delete change error:', error);
    alert('Ошибка удаления');
  }
};

const getChangeDisplay = (item: ScheduleItem) => {
  if (item.is_canceled) {
    return <div className="change-badge canceled">УРОК ОТМЕНЕН</div>;
  }
  if (item.is_changed) {
    return (
      <div className="change-badge replaced">
        ЗАМЕНА: {item.subject_name} ({item.teacher_name})
        {item.original_subject && (
          <div className="original-info">Было: {item.original_subject} ({item.original_teacher})</div>
        )}
        {item.notes && <div className="notes-info">{item.notes}</div>}
      </div>
    );
  }
  if (item.is_added) {
    return (
      <div className="change-badge added">
        ДОБАВЛЕН: {item.subject_name} ({item.teacher_name})
        {item.notes && <div className="notes-info">{item.notes}</div>}
      </div>
    );
  }
  return null;
};

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/profile', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        const role = data.user.role;
        setUserRole(role);
        
        if (role === 'teacher') {
          await loadTeacherClasses();
          await loadSubjects();
        } else {
          await loadStudentClasses();
          await loadStudentSubjects();
        }
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

  const loadStudentClasses = async () => {
    try {
      const response = await fetch('/api/gradebook/myClasses', { credentials: 'include' });
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
      console.error('Load student classes error:', error);
    }
  };

  const loadSubjects = async () => {
    try {
      const response = await fetch('/api/gradebook/subjects', { credentials: 'include' });
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

  const loadStudentSubjects = async () => {
    try {
      const response = await fetch('/api/gradebook/my-subjects', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        const subjectsList: ApiSubjectResponse[] = data.subjects || [];
        const uniqueSubjects: Subject[] = Array.from(
          new Map(subjectsList.map((s: ApiSubjectResponse) => [s.id, { id: s.id, name: s.name }])).values()
        );
        setSubjects(uniqueSubjects);
      }
    } catch (error) {
      console.error('Load student subjects error:', error);
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
          ...formData
        }),
        credentials: 'include'
      });
      
      if (response.ok) {
        setShowAddModal(false);
        setFormData({ subject_id: 0, lesson_number: 1, day_of_week: 1, class_id: 0, room: '' });
        loadTeacherSchedule();
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
      const response = await fetch(`/api/gradebook/schedule/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (response.ok) {
        if (userRole === 'teacher') {
          loadTeacherSchedule();
        } else {
          loadStudentSchedule();
        }
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

  const ScheduleContent = ({ showDeleteButton = false }: { showDeleteButton?: boolean }) => (
    <div className="schedule-grid">
      {daysOfWeek.map(day => (
        <div key={day.value} className="schedule-day">
          <h2 className="day-title">{day.name}</h2>
          <div className="schedule-lessons">
            {getScheduleForDay(day.value).map((item) => (
              <div className={`schedule-lesson ${item.is_canceled ? 'canceled' : ''} ${item.is_changed ? 'changed' : ''} ${item.is_added ? 'added' : ''}`}>
                <div className="lesson-time">{getLessonTime(item.lesson_number)}</div>
                <div className="lesson-subject">{item.subject_name}</div>
                {item.room && (
                  <div className="lesson-class">Класс: {item.class_name}</div>
                )}
                {userRole !== 'teacher' && (
                  <div className="lesson-teacher">{item.teacher_name}</div>
                )}
                {item.room && (
                <div className="lesson-room">Кабинет: {item.room}</div>
                )}
                {getChangeDisplay(item)}
                {userRole === 'teacher' && !item.is_changed && !item.is_canceled && !item.is_added && (
                  <button 
                    className="btn-delete-lesson"
                    onClick={() => handleDeleteSchedule(item.id)}
                  >
                    ✕
                  </button>
                )}
                {userRole === 'teacher' && (item.is_changed || item.is_canceled || item.is_added) && (
                  <button 
                    className="btn-delete-change"
                    onClick={() => handleDeleteChange(item.id)}
                  >
                    Отменить замену
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
  );

  return (
    <div className="schedule-container">
      <h1 className="page-title">
        {userRole === 'teacher' ? 'Мое расписание' : 'Расписание занятий'}
      </h1>
      
      {userRole === 'teacher' ? (
        
        <div className="teacher-controls">
          <button className="btn-primary add-btn" onClick={() => setShowAddModal(true)}>
            Добавить урок в расписание
          </button>
          
          <div className="date-selector">
            <label className="date-label">Дата:</label>
            <input
              type="date"
              className="date-input"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
            <button 
              className="btn-secondary change-btn"
              onClick={() => setShowChangeModal(true)}
            >
              Добавить замену на эту дату
            </button>
          </div>
          
          <div className="class-selector-mini">
            <label className="filter-label">Класс:</label>
            <select
              className="filter-select"
              value={selectedClass || ''}
              onChange={(e) => setSelectedClass(Number(e.target.value))}
            >
              {classes.map((classItem) => (
                <option key={classItem.id} value={classItem.id}>
                  {classItem.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : (
        <div className="class-selector">
          <label className="filter-label">Мой класс</label>
          <div className="current-class">
            {classes.length > 0 ? (
              <span className="class-name">{classes[0]?.name} (выпуск {classes[0]?.year})</span>
            ) : (
              <span className="no-class">Класс не назначен</span>
            )}
          </div>
        </div>
      )}
      
      <ScheduleContent showDeleteButton={userRole === 'teacher'} />
      
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Добавить урок в расписание</h2>
            <form onSubmit={handleAddSchedule}>
              <div className="form-group">
                <label>Класс</label>
                <select
                  value={formData.class_id}
                  onChange={(e) => setFormData({ ...formData, class_id: parseInt(e.target.value) })}
                  required
                >
                  <option value="">Выберите класс</option>
                  {classes.map(classItem => (
                    <option key={classItem.id} value={classItem.id}>
                      {classItem.name}
                    </option>
                  ))}
                </select>
              </div>
              
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

      {showChangeModal && (
  <div className="modal-overlay">
    <div className="modal-content">
      <h2>Добавить замену на {new Date(selectedDate).toLocaleDateString('ru-RU')}</h2>
      <form onSubmit={handleAddChange}>
        <div className="form-group">
          <label>Тип изменения</label>
          <select
            value={changeData.change_type}
            onChange={(e) => setChangeData({ ...changeData, change_type: e.target.value as any })}
            required
          >
            <option value="replace">Замена урока</option>
            <option value="cancel">Отмена урока</option>
            <option value="added">Добавить урок</option>
          </select>
        </div>
        
        <div className="form-group">
          <label>Номер урока</label>
          <select
            value={changeData.lesson_number}
            onChange={(e) => setChangeData({ ...changeData, lesson_number: parseInt(e.target.value) })}
            required
          >
            {lessonTimes.map(lt => (
              <option key={lt.lesson_number} value={lt.lesson_number}>
                {lt.lesson_number} урок ({lt.start_time.slice(0, 5)} - {lt.end_time.slice(0, 5)})
              </option>
            ))}
          </select>
        </div>
        
        {changeData.change_type !== 'cancel' && (
          <>
            <div className="form-group">
              <label>Предмет</label>
              <select
                value={changeData.subject_id}
                onChange={(e) => setChangeData({ ...changeData, subject_id: parseInt(e.target.value) })}
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
                value={changeData.room}
                onChange={(e) => setChangeData({ ...changeData, room: e.target.value })}
                placeholder="Например: 201"
              />
            </div>
          </>
        )}
        
        <div className="form-group">
          <label>Примечание</label>
          <textarea
            value={changeData.notes}
            onChange={(e) => setChangeData({ ...changeData, notes: e.target.value })}
            placeholder="Например: Урок перенесен в кабинет 201"
            rows={2}
          />
        </div>
        
        <div className="modal-buttons">
          <button type="button" onClick={() => setShowChangeModal(false)}>Отмена</button>
          <button type="submit">Сохранить замену</button>
        </div>
      </form>
    </div>
  </div>
)}
      
      <style>{`
      .teacher-controls {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
  flex-wrap: wrap;
  align-items: flex-end;
}

.date-selector {
  display: flex;
  gap: 8px;
  align-items: center;
  background: #f9fafb;
  padding: 8px 16px;
  border-radius: 8px;
}

.date-label {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.date-input {
  padding: 6px 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
}

.class-selector-mini {
  min-width: 180px;
}

.btn-secondary {
  background-color: #10b981;
  color: white;
  padding: 8px 16px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  font-size: 14px;
}

.btn-secondary:hover {
  background-color: #059669;
}

.schedule-lesson.canceled {
  background: #fee2e2;
  opacity: 0.7;
}

.schedule-lesson.changed {
  background: #fef3c7;
  border-left: 4px solid #f59e0b;
}


.schedule-lesson.added {
  background: #c7fedc;
  border-left: 4px solid #0bf56d;
}


.change-badge {
  margin-top: 8px;
  padding: 6px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
}

.change-badge.canceled {
  background: #dc2626;
  color: white;
}

.change-badge.replaced {
  background: #f59e0b;
  color: white;
}

.change-badge.added {
  background: #10b981;
  color: white;
}

.original-info {
  font-size: 10px;
  opacity: 0.9;
  margin-top: 4px;
}

.notes-info {
  font-size: 10px;
  opacity: 0.8;
  margin-top: 4px;
  font-style: italic;
}

.btn-delete-change {
  margin-top: 8px;
  background: none;
  border: 1px solid #dc2626;
  color: #dc2626;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
  width: 100%;
}

.btn-delete-change:hover {
  background: #fee2e2;
}
        .schedule-container {
          padding: 24px;
          max-width: 90%;
          margin: 0 auto;
        }
        
        .page-title {
          font-size: 24px;
          font-weight: 600;
          color: #aeb3b9;
          margin-bottom: 24px;
        }
        
        .class-selector {
          margin-bottom: 20px;
          max-width: 300px;
        }
        
        .filter-label {
          display: block;
          font-size: 14px;
          font-weight: 500;
          color: #374151;
          margin-bottom: 6px;
        }
        
        .current-class {
          padding: 8px 12px;
          background: #f3f4f6;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
        }
        
        .class-name {
          font-weight: 500;
          color: #1f2937;
        }
        
        .no-class {
          color: #9ca3af;
        }
        
        .add-btn {
          margin-bottom: 24px;
        }
        
        .btn-primary {
          background-color: #3b82f6;
          color: white;
          padding: 8px 16px;
          border-radius: 8px;
          border: none;
          cursor: pointer;
          font-size: 14px;
        }
        
        .btn-primary:hover {
          background-color: #2563eb;
        }
        
        .schedule-grid {
          display: flex;
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
        
        .lesson-class,
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
        
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        
        .modal-content {
          background: white;
          border-radius: 12px;
          padding: 24px;
          width: 400px;
          max-width: 90%;
        }
        
        .modal-content h2 {
          font-size: 20px;
          margin-bottom: 20px;
        }
        
        .form-group {
          margin-bottom: 16px;
        }
        
        .form-group label {
          display: block;
          font-size: 14px;
          font-weight: 500;
          color: #374151;
          margin-bottom: 6px;
        }
        
        .form-group select,
        .form-group input {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 14px;
        }
        
        .modal-buttons {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 20px;
        }
        
        .modal-buttons button {
          padding: 8px 16px;
          border-radius: 8px;
          cursor: pointer;
        }
        
        .modal-buttons button:first-child {
          background: white;
          border: 1px solid #d1d5db;
        }
        
        .modal-buttons button:last-child {
          background: #3b82f6;
          color: white;
          border: none;
        }
        
        @media (max-width: 768px) {
          
          .schedule-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

export default SchedulePage;