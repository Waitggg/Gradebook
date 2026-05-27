import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import type { CourseProgram, CourseLesson, LessonType } from '../types/courseTypes';
import { lessonTypeLabels, lessonTypeColors } from '../types/courseTypes';

interface ClassInfo {
  id: number;
  name: string;
  year: number;
}

interface SubjectInfo {
  id: number;
  name: string;
}

function CourseProgramPage() {
  const { subjectId, classId } = useParams();
  const [loading, setLoading] = useState(true);
  const [program, setProgram] = useState<CourseProgram | null>(null);
  const [lessons, setLessons] = useState<CourseLesson[]>([]);
  const [subject, setSubject] = useState<SubjectInfo | null>(null);
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
  
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [showProgramModal, setShowProgramModal] = useState(false);
  const [editingLesson, setEditingLesson] = useState<CourseLesson | null>(null);
  
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  
  const [programForm, setProgramForm] = useState({
    total_hours: 0,
    description: ''
  });
  
  const [lessonForm, setLessonForm] = useState({
    lesson_number: 1,
    lesson_type: 'lecture' as LessonType,
    title: '',
    description: '',
    max_score: 10,
    requirements: ''
  });
  
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<CourseLesson | null>(null);
  const [teamForm, setTeamForm] = useState({ team_name: '', max_members: 5 });
  
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [materialForm, setMaterialForm] = useState({ title: '', file_url: '', file_name: '' });

  const loadData = async () => {
    setLoading(true);
    try {
      const programRes = await fetch(`/api/course/program/${subjectId}/${classId}`, {
        credentials: 'include'
      });
      const programData = await programRes.json();
      const programInfo = programData.success ? programData.program : null;
      setProgram(programInfo);
      
      if (programInfo) {
        setProgramForm({
          total_hours: programInfo.total_hours || 0,
          description: programInfo.description || ''
        });
        
        const lessonsRes = await fetch(`/api/course/lessons/${programInfo.id}`, {
          credentials: 'include'
        });
        const lessonsData = await lessonsRes.json();
        setLessons(lessonsData.success ? lessonsData.lessons : []);
      }
      
      const subjectsRes = await fetch('/api/gradebook/subjects', { credentials: 'include' });
      const subjectsData = await subjectsRes.json();
      const foundSubject = subjectsData.subjects?.find((s: SubjectInfo) => s.id === Number(subjectId));
      setSubject(foundSubject || null);
      
      const classesRes = await fetch('/api/gradebook/classes', { credentials: 'include' });
      const classesData = await classesRes.json();
      const foundClass = classesData.classes?.find((c: ClassInfo) => c.id === Number(classId));
      setClassInfo(foundClass || null);
      
    } catch (error) {
      console.error('Load data error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [subjectId, classId]);

  const handleSaveProgram = async () => {
    const response = await fetch('/api/course/program', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject_id: Number(subjectId),
        class_id: Number(classId),
        total_hours: programForm.total_hours,
        description: programForm.description
      }),
      credentials: 'include'
    });
    
    const result = await response.json();
    if (result.success) {
      setProgram(result.program);
      setShowProgramModal(false);
      alert('Программа сохранена');
      loadData();
    } else {
      alert('Ошибка сохранения');
    }
  };

  const handleSaveLesson = async () => {
  if (!program) {
    alert('Сначала создайте программу курса');
    return;
  }
  
  // ✅ Проверка на существующий номер занятия
  const existingLesson = lessons.find(l => l.lesson_number === lessonForm.lesson_number);
  if (existingLesson) {
    alert(`❌ Занятие с номером ${lessonForm.lesson_number} уже существует. Пожалуйста, выберите другой номер.`);
    return;
  }
  
  const response = await fetch('/api/course/lessons', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      course_program_id: program.id,
      ...lessonForm
    }),
    credentials: 'include'
  });
  
  const result = await response.json();
  if (result.success) {
    setShowLessonModal(false);
    setEditingLesson(null);
    setLessonForm({
      lesson_number: lessons.length + 1,
      lesson_type: 'lecture',
      title: '',
      description: '',
      max_score: 10,
      requirements: ''
    });
    loadData();
  } else {
    alert(result.message || 'Ошибка сохранения');
  }
};

  const handleUpdateLesson = async () => {
  if (!editingLesson) return;
  
  // ✅ При редактировании проверяем, не пытается ли пользователь сменить номер на уже существующий
  if (lessonForm.lesson_number !== editingLesson.lesson_number) {
    const existingLesson = lessons.find(l => 
      l.lesson_number === lessonForm.lesson_number && l.id !== editingLesson.id
    );
    if (existingLesson) {
      alert(`❌ Занятие с номером ${lessonForm.lesson_number} уже существует. Пожалуйста, выберите другой номер.`);
      return;
    }
  }
  
  const response = await fetch(`/api/course/lessons/${editingLesson.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(lessonForm),
    credentials: 'include'
  });
  
  const result = await response.json();
  if (result.success) {
    setShowLessonModal(false);
    setEditingLesson(null);
    setLessonForm({
      lesson_number: lessons.length + 1,
      lesson_type: 'lecture',
      title: '',
      description: '',
      max_score: 10,
      requirements: ''
    });
    loadData();
  } else {
    alert(result.message || 'Ошибка обновления');
  }
};

  const handleDeleteLesson = async (id: number) => {
    if (!confirm('Удалить это занятие?')) return;
    const response = await fetch(`/api/course/lessons/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    const result = await response.json();
    if (result.success) {
      loadData();
    } else {
      alert('Ошибка удаления');
    }
  };

  const handleAddMaterial = async (lessonId: number) => {
    if (!materialForm.title) {
      alert('Введите название материала');
      return;
    }
    
    const response = await fetch('/api/course/materials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        course_lesson_id: lessonId,
        title: materialForm.title,
        file_url: materialForm.file_url || null,
        file_name: materialForm.file_name || null
      }),
      credentials: 'include'
    });
    
    const result = await response.json();
    if (result.success) {
      setShowMaterialModal(false);
      setMaterialForm({ title: '', file_url: '', file_name: '' });
      loadData();
    } else {
      alert('Ошибка добавления материала');
    }
  };

  const handleDeleteMaterial = async (materialId: number) => {
    if (!confirm('Удалить этот материал?')) return;
    
    const response = await fetch(`/api/course/materials/${materialId}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    
    const result = await response.json();
    if (result.success) {
      loadData();
    } else {
      alert('Ошибка удаления материала');
    }
  };

  // Export/import helpers (Excel .xlsx)
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleExportProgram = async () => {
    if (!program) {
      alert('Нет программы для экспорта');
      return;
    }

    try {
      const XLSX: any = await import('xlsx');

      // Program sheet (single row)
      const progSheetData = [
        {
          subjectId: Number(subjectId),
          classId: Number(classId),
          total_hours: program.total_hours || 0,
          description: program.description || ''
        }
      ];
      const wsProg = XLSX.utils.json_to_sheet(progSheetData);

      // Lessons sheet
      const lessonsData = lessons.map((l) => ({
        lesson_number: l.lesson_number,
        lesson_type: l.lesson_type,
        title: l.title,
        description: l.description || '',
        max_score: l.max_score,
        requirements: l.requirements || ''
      }));
      const wsLessons = XLSX.utils.json_to_sheet(lessonsData);

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, wsProg, 'Program');
      XLSX.utils.book_append_sheet(wb, wsLessons, 'Lessons');

      const filename = `course_program_${subjectId}_${classId}.xlsx`;
      // writeFile works in browser when using the xlsx package
      XLSX.writeFile(wb, filename);
    } catch (err) {
      console.error('Export XLSX error', err);
      alert('Ошибка при экспорте в Excel. Установите пакет "xlsx" и обновите страницу.');
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const f = e.target.files?.[0];
  if (!f) return;
  try {
    const ab = await f.arrayBuffer();
    const XLSX: any = await import('xlsx');
    const wb = XLSX.read(ab, { type: 'array' });

    const progSheet = wb.Sheets['Program'] || wb.Sheets[wb.SheetNames[0]];
    const progArr = XLSX.utils.sheet_to_json(progSheet as any);
    const prog = progArr && progArr[0];
    if (!prog) {
      alert('Файл не содержит корректную программу (лист Program)');
      return;
    }

    if (program && !confirm('Текущая программа будет заменена. Продолжить?')) return;

    // Create/update program
    const resp = await fetch('/api/course/program', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject_id: Number(subjectId),
        class_id: Number(classId),
        total_hours: prog.total_hours || prog.total_hours || 0,
        description: prog.description || ''
      }),
      credentials: 'include'
    });

    const resJson = await resp.json();
    if (!resJson.success) {
      alert('Не удалось импортировать программу: ' + (resJson.message || 'ошибка'));
      return;
    }

    const newProgram = resJson.program;

    // Lessons
    const lessonsSheet = wb.Sheets['Lessons'] || null;
    if (lessonsSheet) {
      const lessonsArr = XLSX.utils.sheet_to_json(lessonsSheet as any) as any[];
      
      // ✅ Проверка на дубликаты номеров занятий
      const lessonNumbers = new Set<number>();
      const duplicateNumbers: number[] = [];
      
      for (const l of lessonsArr) {
        const lessonNumber = Number(l.lesson_number);
        if (lessonNumbers.has(lessonNumber)) {
          duplicateNumbers.push(lessonNumber);
        } else {
          lessonNumbers.add(lessonNumber);
        }
      }
      
      if (duplicateNumbers.length > 0) {
        alert(`❌ Ошибка: В файле обнаружены дубликаты номеров занятий: ${duplicateNumbers.join(', ')}.\n\nКаждое занятие должно иметь уникальный номер. Исправьте файл и попробуйте снова.`);
        return;
      }
      
      // Сортируем занятия по номеру перед импортом
      const sortedLessons = [...lessonsArr].sort((a, b) => 
        Number(a.lesson_number) - Number(b.lesson_number)
      );
      
      let importErrors: string[] = [];
      
      for (const l of sortedLessons) {
        const lessonNumber = Number(l.lesson_number);
        
        // Проверяем, существует ли уже занятие с таким номером в программе
        const existingLesson = lessons.find(existing => existing.lesson_number === lessonNumber);
        
        if (existingLesson) {
          importErrors.push(`Занятие №${lessonNumber} ("${l.title || 'без назлия'}") - номер уже существует`);
          continue;
        }
        
        const lessonPayload = {
          course_program_id: newProgram.id,
          lesson_number: lessonNumber,
          lesson_type: l.lesson_type || 'lecture',
          title: l.title || '',
          description: l.description || '',
          max_score: l.max_score || 10,
          requirements: l.requirements || ''
        };

        const response = await fetch('/api/course/lessons', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(lessonPayload),
          credentials: 'include'
        });
        
        const result = await response.json();
        if (!result.success) {
          importErrors.push(`Занятие №${lessonNumber}: ${result.message || 'ошибка сохранения'}`);
        }
      }
      
      if (importErrors.length > 0) {
        alert(`⚠️ Импорт завершён с ошибками:\n\n${importErrors.join('\n')}\n\nОстальные занятия добавлены успешно.`);
      } else {
        alert('✅ Импорт из Excel завершён успешно.');
      }
    } else {
      alert('✅ Программа импортирована, но лист Lessons не найден.');
    }
    
    loadData();
  } catch (err) {
    console.error('Import XLSX error', err);
    alert('Ошибка при импорте Excel файла. Убедитесь, что файл .xlsx и содержит листы Program и Lessons.');
  } finally {
    if (fileInputRef.current) fileInputRef.current.value = '';
  }
};

  const handleSubmitLesson = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingLesson) {
      handleUpdateLesson();
    } else {
      handleSaveLesson();
    }
  };

  if (loading) {
    return <div className="loading">Загрузка...</div>;
  }

  return (
    <div className="course-program">
      <div className="program-header">
        <div>
          <h1 className="program-title">📋 Программа курса: {subject?.name}</h1>
          <div className="program-info">
            <span className="class-badge">🏫 Класс: {classInfo?.name}</span>
            {program && (
              <>
                <span className="hours-badge">⏱️ Часов: {program.total_hours}</span>
                <span className="description-badge">📝 {program.description || 'Без описания'}</span>
              </>
            )}
          </div>
        </div>
        <div className="program-header-actions">
          {/* Кнопки переключения режима отображения */}
          <div className="view-toggle">
            <button 
              className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="Список"
            >
              ☰
            </button>
            <button 
              className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Сетка"
            >
              ⊞
            </button>
          </div>
          <div className="import-export" style={{ display: 'flex', gap: 8, marginLeft: 8 }}>
            <button className="btn-secondary" onClick={handleImportClick}>Импорт</button>
            <button className="btn-secondary" onClick={handleExportProgram}>Экспорт</button>
            <input ref={fileInputRef} type="file" accept=".xlsx, .xls, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" style={{ display: 'none' }} onChange={handleImportFile} />
          </div>
          {program && (
            <button className="btn-edit-program" onClick={() => setShowProgramModal(true)}>
              ✏️ Редактировать программу
            </button>
          )}
        </div>
      </div>

      {!program ? (
        <div className="no-program">
          <div className="no-program-icon">📚</div>
          <p>Программа курса еще не создана</p>
          <button className="btn-primary" onClick={() => setShowProgramModal(true)}>
            + Создать программу
          </button>
        </div>
      ) : (
        <>
          <div className="toolbar">
            <button className="btn-primary" onClick={() => setShowLessonModal(true)}>
              + Добавить занятие
            </button>
          </div>

          <div className={`lessons-container ${viewMode}`}>
            {lessons.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📖</div>
                <p>Нет добавленных занятий</p>
                <button className="btn-secondary" onClick={() => setShowLessonModal(true)}>
                  Добавить первое занятие
                </button>
              </div>
            ) : (
              lessons.map((lesson) => (
                <div key={lesson.id} className={`lesson-card ${viewMode}`} style={{ borderTopColor: lessonTypeColors[lesson.lesson_type] }}>
                  <div className="lesson-card-header">
                    <div className="lesson-type" style={{ background: lessonTypeColors[lesson.lesson_type] }}>
                      {lessonTypeLabels[lesson.lesson_type]}
                    </div>
                    <div className="lesson-title">#{lesson.lesson_number}. {lesson.title}</div>
                    <div className="lesson-card-actions">
                      <button 
                        className="icon-btn edit"
                        onClick={() => {
                          setEditingLesson(lesson);
                          setLessonForm({
                            lesson_number: lesson.lesson_number,
                            lesson_type: lesson.lesson_type,
                            title: lesson.title,
                            description: lesson.description || '',
                            max_score: lesson.max_score,
                            requirements: lesson.requirements || ''
                          });
                          setShowLessonModal(true);
                        }}
                      >
                        ✏️
                      </button>
                      <button className="icon-btn delete" onClick={() => handleDeleteLesson(lesson.id)}>
                        🗑️
                      </button>
                    </div>
                  </div>

                  <div className="lesson-meta">
                    <span className="meta-item">⭐ Макс. балл: {lesson.max_score}</span>
                  </div>

                  {lesson.description && (
                    <div className="lesson-description">{lesson.description}</div>
                  )}

                  {lesson.requirements && (
                    <div className="lesson-requirements">
                      <strong>📄 ТЗ:</strong> {lesson.requirements}
                    </div>
                  )}

                  {lesson.materials && lesson.materials.length > 0 && (
                    <div className="lesson-materials">
                      <strong>📎 Материалы:</strong>
                      <div className="materials-list">
                        {lesson.materials.map((m) => (
                          <div key={m.id} className="material-item">
                            <span className="material-chip">
                              {m.file_url ? (
                                <a href={m.file_url} target="_blank" rel="noopener noreferrer">{m.title}</a>
                              ) : (
                                m.title
                              )}
                            </span>
                            <button 
                              className="material-delete-btn"
                              onClick={() => handleDeleteMaterial(m.id)}
                              title="Удалить материал"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="lesson-actions-bottom">
                    <button 
                      className="btn-small" 
                      onClick={() => {
                        setSelectedLesson(lesson);
                        setShowMaterialModal(true);
                      }}
                    >
                      + Материал
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {showProgramModal && (
        <div className="modal-overlay" onClick={() => setShowProgramModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{program ? 'Редактировать программу' : 'Создать программу'}</h2>
            <form onSubmit={(e) => { e.preventDefault(); handleSaveProgram(); }}>
              <div className="form-group">
                <label>Общее количество часов</label>
                <input 
                  type="number" 
                  min="0" 
                  value={programForm.total_hours} 
                  onChange={(e) => setProgramForm({ ...programForm, total_hours: parseInt(e.target.value) || 0 })}
                  required 
                />
              </div>
              <div className="form-group">
                <label>Описание программы</label>
                <textarea 
                  value={programForm.description} 
                  onChange={(e) => setProgramForm({ ...programForm, description: e.target.value })}
                  rows={4}
                  placeholder="Краткое описание курса, цели и задачи..."
                />
              </div>
              <div className="modal-buttons">
                <button type="button" onClick={() => setShowProgramModal(false)}>Отмена</button>
                <button type="submit">Сохранить</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showLessonModal && (
        <div className="modal-overlay" onClick={() => setShowLessonModal(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <h2>{editingLesson ? '✏️ Редактировать занятие' : '➕ Добавить занятие'}</h2>
            <form onSubmit={handleSubmitLesson}>
              <div className="form-row">
                <div className="form-group">
                  <label>Номер занятия *</label>
                  <input type="number" value={lessonForm.lesson_number} onChange={(e) => setLessonForm({ ...lessonForm, lesson_number: parseInt(e.target.value) })} required />
                </div>
                <div className="form-group">
                  <label>Тип занятия *</label>
                  <select value={lessonForm.lesson_type} onChange={(e) => setLessonForm({ ...lessonForm, lesson_type: e.target.value as LessonType })}>
                    <option value="lecture">📖 Лекция</option>
                    <option value="lab">🔬 Лабораторная</option>
                    <option value="practice">✏️ Практика</option>
                    <option value="control">📝 Контрольная</option>
                    <option value="exam">🎓 Экзамен</option>
                  </select>
                </div>
              </div>
              
              <div className="form-group">
                <label>Название занятия *</label>
                <input type="text" value={lessonForm.title} onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })} required placeholder="Например: Введение в программирование" />
              </div>
              
              <div className="form-group">
                <label>Описание</label>
                <textarea value={lessonForm.description} onChange={(e) => setLessonForm({ ...lessonForm, description: e.target.value })} rows={2} placeholder="Краткое описание содержания занятия" />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>⭐ Максимальный балл</label>
                  <input type="number" min="1" max="100" value={lessonForm.max_score} onChange={(e) => setLessonForm({ ...lessonForm, max_score: parseInt(e.target.value) })} />
                </div>
              </div>
              
              <div className="form-group">
                <label>📄 ТЗ / Задание</label>
                <textarea value={lessonForm.requirements} onChange={(e) => setLessonForm({ ...lessonForm, requirements: e.target.value })} rows={3} placeholder="Ссылка на ТЗ или описание задания..." />
              </div>
              
              <div className="modal-buttons">
                <button type="button" onClick={() => setShowLessonModal(false)}>Отмена</button>
                <button type="submit">{editingLesson ? 'Обновить' : 'Создать'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showMaterialModal && (
        <div className="modal-overlay" onClick={() => setShowMaterialModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>📎 Добавить материал</h2>
            <div className="form-group">
              <label>Название материала *</label>
              <input type="text" value={materialForm.title} onChange={(e) => setMaterialForm({ ...materialForm, title: e.target.value })} required placeholder="Например: Презентация к лекции 1" />
            </div>
            <div className="form-group">
              <label>Ссылка на файл (URL)</label>
              <input type="url" value={materialForm.file_url} onChange={(e) => setMaterialForm({ ...materialForm, file_url: e.target.value })} placeholder="https://drive.google.com/..." />
            </div>
            <div className="modal-buttons">
              <button type="button" onClick={() => setShowMaterialModal(false)}>Отмена</button>
              <button onClick={() => handleAddMaterial(selectedLesson!.id)}>Добавить</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .course-program {
          padding: 32px;
          max-width: 1400px;
          margin: 0 auto;
          min-height: 100vh;
          background: #f3f4f6;
        }
        
        .program-header {
          background: white;
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 24px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        
        .program-title {
          font-size: 28px;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 12px;
        }
        
        .program-info {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 8px;
        }
        
        .class-badge, .hours-badge, .description-badge {
          padding: 6px 14px;
          background: #f3f4f6;
          border-radius: 20px;
          font-size: 14px;
          color: #4b5563;
        }
        
        .program-header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        /* Стили для переключателя отображения */
        .view-toggle {
          display: flex;
          background: #f3f4f6;
          border-radius: 10px;
          padding: 3px;
          gap: 2px;
        }
        
        .view-toggle-btn {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          background: transparent;
          border-radius: 8px;
          font-size: 18px;
          cursor: pointer;
          transition: all 0.2s;
          color: #6b7280;
        }
        
        .view-toggle-btn:hover {
          background: #e5e7eb;
          color: #374151;
        }
        
        .view-toggle-btn.active {
          background: white;
          color: #3b82f6;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        
        .btn-edit-program {
          padding: 8px 20px;
          background: #6596f349;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s;
        }
        
        .btn-edit-program:hover {
          background: #6597f3a9;
        }
        
        .toolbar {
          margin-bottom: 24px;
        }
        
        .btn-primary {
          padding: 10px 20px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .btn-primary:hover {
          background: #2563eb;
          transform: translateY(-1px);
        }
        
        .btn-secondary {
          padding: 10px 20px;
          background: #6596f349;
          color: #ffffff;
          border: none;
          border-radius: 10px;
          font-size: 14px;
          cursor: pointer;
        }
        
        .btn-secondary:hover {
          background: #6597f3a9;
        }
        
        /* Контейнер уроков */
        .lessons-container {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        
        /* Сетка для grid режима: компактная сетка с максимум 3 карточками в ряду */
        .lessons-container.grid {
          display: grid;
          grid-template-columns: repeat(1, 1fr);
          gap: 16px;
          align-items: start;
        }
        @media (min-width: 640px) {
          .lessons-container.grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (min-width: 1100px) {
          .lessons-container.grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
        
        /* Карточка урока */
        .lesson-card {
          background: white;
          border-radius: 16px;
          padding: 20px;
          border-top: 4px solid;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          transition: all 0.2s;
          box-sizing: border-box;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        
        .lesson-card:hover {
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        
        /* Компактный вид карточки в grid режиме */
        .lesson-card.grid {
          padding: 16px;
        }

        /* В сетке заставляем карточки равняться по высоте, чтобы сетка выглядела аккуратно */
        .lessons-container.grid .lesson-card {
          height: 100%;
        }
        
        .lesson-card.grid .lesson-card-header {
          margin-bottom: 10px;
        }
        
        .lesson-card.grid .lesson-title {
          font-size: 15px;
        }
        
        .lesson-card.grid .lesson-meta {
          margin-bottom: 8px;
          padding-bottom: 8px;
        }
        
        .lesson-card.grid .lesson-description,
        .lesson-card .lesson-description {
          font-size: 13px;
          margin-bottom: 8px;
          display: -webkit-box;
          -webkit-line-clamp: 4;
          -webkit-box-orient: vertical;
          overflow: hidden;
          word-wrap: break-word;
          overflow-wrap: anywhere;
        }
        
        .lesson-card.grid .lesson-requirements,
        .lesson-card .lesson-requirements {
          padding: 8px 12px;
          font-size: 12px;
          margin-bottom: 8px;
          display: -webkit-box;
          -webkit-line-clamp: 4;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        
        .lesson-card.grid .lesson-materials {
          font-size: 12px;
        }
        
        .lesson-card.grid .lesson-actions-bottom {
          margin-top: auto;
          padding-top: 8px;
        }
        
        .lesson-card-header {
          display: grid;
          grid-template-columns: auto 1fr auto;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }
        
        .lesson-type {
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          color: white;
          white-space: nowrap;
        }
        
        .lesson-title {
          font-weight: 600;
          font-size: 18px;
          color: #1f2937;
          justify-self: center;
          min-width: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .lesson-card-actions {
          display: flex;
          gap: 8px;
          margin-left: auto;
        }
        
        .icon-btn {
          background: none;
          border: none;
          font-size: 18px;
          cursor: pointer;
          padding: 6px 10px;
          border-radius: 8px;
          transition: all 0.2s;
        }
        
        .icon-btn.edit:hover {
          background: #dbeafe;
        }
        
        .icon-btn.delete:hover {
          background: #fee2e2;
        }
        
        .lesson-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .meta-item {
          font-size: 13px;
          color: #6b7280;
        }
        
        .meta-item.deadline {
          color: #d97706;
          font-weight: 500;
        }
        
        .lesson-description {
          color: #4b5563;
          font-size: 14px;
          line-height: 1.5;
          margin-bottom: 16px;
        }
        
        .lesson-requirements {
          background: #fef3c7;
          padding: 12px 16px;
          border-radius: 10px;
          margin-bottom: 16px;
          font-size: 14px;
        }
        
        .lesson-materials, .lesson-teams {
          margin-top: 12px;
          font-size: 14px;
        }
        
        .materials-list, .teams-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 8px;
          max-height: 96px;
          overflow: auto;
        }
        
        .material-item {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        
        .material-chip, .team-chip {
          padding: 4px 12px;
          background: #f3f4f6;
          border-radius: 16px;
          font-size: 12px;
        }
        
        .material-chip a {
          text-decoration: none;
          color: #3b82f6;
        }
        
        .material-delete-btn {
          width: 20px;
          height: 20px;
          padding: 0;
          border: none;
          background: #fd2c2c79;
          color: white;
          border-radius: 50%;
          font-size: 11px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          line-height: 1;
        }
        
        .material-delete-btn:hover {
          background: #dc2626;
          transform: scale(1.1);
        }
        
        .team-chip {
          background: #e0e7ff;
          color: #3730a3;
        }
        
        .lesson-actions-bottom {
          display: flex;
          gap: 8px;
          margin-top: 16px;
          padding-top: 12px;
          border-top: 1px solid #e5e7eb;
        }
        
        .btn-small {
          padding: 6px 14px;
          background: #6596f349;
          border: none;
          border-radius: 8px;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .btn-small:hover {
          background: #6597f3a9;
        }
        
        .no-program {
          text-align: center;
          padding: 80px 40px;
          background: white;
          border-radius: 24px;
        }
        
        .no-program-icon, .empty-icon {
          font-size: 64px;
          margin-bottom: 20px;
        }
        
        .empty-state {
          text-align: center;
          padding: 60px;
          background: white;
          border-radius: 16px;
          color: #9ca3af;
        }
        
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          backdrop-filter: blur(2px);
        }
        
        .modal-content {
          background: white;
          border-radius: 24px;
          padding: 32px;
          max-width: 500px;
          width: 90%;
          max-height: 90vh;
          overflow-y: auto;
        }
        
        .modal-content.modal-large {
          max-width: 700px;
        }
        
        .modal-content h2 {
          font-size: 24px;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 24px;
        }
        
        .form-group {
          margin-bottom: 20px;
        }
        
        .form-group label {
          display: block;
          font-size: 14px;
          font-weight: 500;
          color: #374151;
          margin-bottom: 8px;
        }
        
        .form-group input,
        .form-group select,
        .form-group textarea {
          width: 100%;
          padding: 10px 14px;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          font-size: 14px;
          transition: all 0.2s;
          font-family: inherit;
        }
        
        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        
        .form-group small {
          display: block;
          margin-top: 4px;
          font-size: 11px;
          color: #9ca3af;
        }
        
        .form-row {
          display: flex;
          gap: 16px;
        }
        
        .form-row .form-group {
          flex: 1;
        }
        
        .modal-buttons {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 24px;
        }
        
        .modal-buttons button {
          padding: 10px 24px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .modal-buttons button:first-child {
          background: #f3f4f6;
          border: none;
          color: #6b7280;
        }
        
        .modal-buttons button:first-child:hover {
          background: #e5e7eb;
        }
        
        .modal-buttons button:last-child {
          background: #3b82f6;
          border: none;
          color: white;
        }
        
        .modal-buttons button:last-child:hover {
          background: #2563eb;
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
          .course-program {
            padding: 16px;
          }
          
          .program-header {
            flex-direction: column;
            gap: 16px;
          }
          
          .program-header-actions {
            width: 100%;
            justify-content: flex-end;
          }
          
          .program-title {
            font-size: 22px;
          }
          
          .form-row {
            flex-direction: column;
            gap: 0;
          }
          
          .modal-content {
            padding: 24px;
          }
          
          .lessons-container.grid {
            grid-template-columns: 1fr;
          }
        }
        
        @media (max-width: 480px) {
          .lessons-container.grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

export default CourseProgramPage;