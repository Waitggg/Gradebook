import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
    const [userRole, setUserRole] = useState(null);
    const [classes, setClasses] = useState([]);
    const [selectedClass, setSelectedClass] = useState(null);
    const [schedule, setSchedule] = useState([]);
    const [lessonTimes, setLessonTimes] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [formData, setFormData] = useState({
        subject_id: 0,
        lesson_number: 1,
        day_of_week: 1,
        class_id: 0,
        room: ''
    });
    const [showChangeModal, setShowChangeModal] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [changeData, setChangeData] = useState({
        subject_id: 0,
        lesson_number: 1,
        room: '',
        change_type: 'replace',
        notes: ''
    });
    useEffect(() => {
        checkAuth();
    }, []);
    useEffect(() => {
        if ((userRole === 'teacher' || userRole === 'admin') && selectedClass && selectedDate) {
            loadTeacherSchedule();
        }
    }, [selectedClass, selectedDate, userRole]);
    useEffect(() => {
        if (userRole === 'student' && selectedClass && selectedDate) {
            loadStudentSchedule();
        }
    }, [selectedClass, selectedDate, userRole]);
    const loadTeacherSchedule = async () => {
        if (!selectedClass)
            return;
        try {
            const response = await fetch(`/api/schedule/class/${selectedClass}/week/${selectedDate}`, {
                credentials: 'include'
            });
            if (response.ok) {
                const data = await response.json();
                const allLessons = [];
                data.week_schedule?.forEach((day) => {
                    day.lessons.forEach((lesson) => {
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
        }
        catch (error) {
            console.error('Load teacher schedule error:', error);
        }
    };
    const loadStudentSchedule = async () => {
        if (!selectedClass)
            return;
        try {
            const response = await fetch(`/api/schedule/class/${selectedClass}/week/${selectedDate}`, {
                credentials: 'include'
            });
            if (response.ok) {
                const data = await response.json();
                const allLessons = [];
                data.week_schedule?.forEach((day) => {
                    day.lessons.forEach((lesson) => {
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
        }
        catch (error) {
            console.error('Load student schedule error:', error);
        }
    };
    const loadTeacherClasses = async () => {
        try {
            const response = await fetch('/api/gradebook/myClasses', { credentials: 'include' });
            if (response.ok) {
                const data = await response.json();
                const classesList = data.classes || [];
                const uniqueClasses = Array.from(new Map(classesList.map((c) => [c.id, { id: c.id, name: c.name, year: c.year }])).values());
                setClasses(uniqueClasses);
                if (uniqueClasses.length > 0 && !selectedClass) {
                    setSelectedClass(uniqueClasses[0].id);
                }
            }
        }
        catch (error) {
            console.error('Load teacher classes error:', error);
        }
    };
    const handleAddChange = async (e) => {
        e.preventDefault();
        if (!selectedClass)
            return;
        try {
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
            }
            else {
                const error = await response.json();
                alert(error.message || 'Ошибка добавления изменения');
            }
        }
        catch (error) {
            console.error('Add change error:', error);
            alert('Ошибка добавления изменения');
        }
    };
    const handleDeleteChange = async (changeId) => {
        if (!confirm('Удалить это изменение?'))
            return;
        try {
            const response = await fetch(`/api/schedule/changes/${changeId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            if (response.ok) {
                loadTeacherSchedule();
                alert('Изменение удалено');
            }
            else {
                alert('Ошибка удаления');
            }
        }
        catch (error) {
            console.error('Delete change error:', error);
            alert('Ошибка удаления');
        }
    };
    const getChangeDisplay = (item) => {
        if (item.is_canceled) {
            return _jsx("div", { className: "change-badge canceled", children: "\u0423\u0420\u041E\u041A \u041E\u0422\u041C\u0415\u041D\u0415\u041D" });
        }
        if (item.is_changed) {
            return (_jsxs("div", { className: "change-badge replaced", children: ["\u0417\u0410\u041C\u0415\u041D\u0410: ", item.subject_name, " (", item.teacher_name, ")", item.original_subject && (_jsxs("div", { className: "original-info", children: ["\u0411\u044B\u043B\u043E: ", item.original_subject, " (", item.original_teacher, ")"] })), item.notes && _jsx("div", { className: "notes-info", children: item.notes })] }));
        }
        if (item.is_added) {
            return (_jsxs("div", { className: "change-badge added", children: ["\u0414\u041E\u0411\u0410\u0412\u041B\u0415\u041D: ", item.subject_name, " (", item.teacher_name, ")", item.notes && _jsx("div", { className: "notes-info", children: item.notes })] }));
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
                if (role === 'teacher' || role === 'admin') {
                    await loadTeacherClasses();
                    await loadSubjects();
                }
                else {
                    await loadStudentClasses();
                    await loadStudentSubjects();
                }
                await loadLessonTimes();
            }
            else {
                navigate('/login');
            }
        }
        catch (error) {
            console.error('Auth error:', error);
            navigate('/login');
        }
        finally {
            setLoading(false);
        }
    };
    const loadStudentClasses = async () => {
        try {
            const response = await fetch('/api/gradebook/myClasses', { credentials: 'include' });
            if (response.ok) {
                const data = await response.json();
                const classesList = data.classes || [];
                const uniqueClasses = Array.from(new Map(classesList.map((c) => [c.id, { id: c.id, name: c.name, year: c.year }])).values());
                setClasses(uniqueClasses);
                if (uniqueClasses.length > 0 && !selectedClass) {
                    setSelectedClass(uniqueClasses[0].id);
                }
            }
        }
        catch (error) {
            console.error('Load student classes error:', error);
        }
    };
    const loadSubjects = async () => {
        try {
            const response = await fetch('/api/gradebook/subjects', { credentials: 'include' });
            if (response.ok) {
                const data = await response.json();
                const subjectsList = data.subjects || [];
                const uniqueSubjects = Array.from(new Map(subjectsList.map((s) => [s.id, { id: s.id, name: s.name }])).values());
                if (userRole === 'admin') {
                    setSubjects(subjectsList);
                }
                else {
                    setSubjects(uniqueSubjects);
                }
            }
        }
        catch (error) {
            console.error('Load subjects error:', error);
        }
    };
    const loadStudentSubjects = async () => {
        try {
            const response = await fetch('/api/gradebook/my-subjects', { credentials: 'include' });
            if (response.ok) {
                const data = await response.json();
                const subjectsList = data.subjects || [];
                const uniqueSubjects = Array.from(new Map(subjectsList.map((s) => [s.id, { id: s.id, name: s.name }])).values());
                setSubjects(uniqueSubjects);
            }
        }
        catch (error) {
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
        }
        catch (error) {
            console.error('Load lesson times error:', error);
        }
    };
    const handleAddSchedule = async (e) => {
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
            }
            else {
                const error = await response.json();
                alert(error.message || 'Ошибка добавления');
            }
        }
        catch (error) {
            console.error('Add schedule error:', error);
            alert('Ошибка добавления');
        }
    };
    const handleDeleteSchedule = async (id) => {
        if (!confirm('Удалить этот урок из расписания?'))
            return;
        try {
            const response = await fetch(`/api/gradebook/schedule/${id}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            if (response.ok) {
                if (userRole === 'admin') {
                    loadTeacherSchedule();
                }
            }
            else {
                alert('Ошибка удаления');
            }
        }
        catch (error) {
            console.error('Delete schedule error:', error);
            alert('Ошибка удаления');
        }
    };
    const getScheduleForDay = (day) => {
        const dayLessons = schedule.filter(item => item.day_of_week === day)
            .sort((a, b) => a.lesson_number - b.lesson_number);
        return dayLessons;
    };
    const getLessonTime = (lessonNumber) => {
        const time = lessonTimes.find(lt => lt.lesson_number === lessonNumber);
        return time ? `${time.start_time.slice(0, 5)} - ${time.end_time.slice(0, 5)}` : '';
    };
    if (loading) {
        return _jsx("div", { className: "loading", children: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430..." });
    }
    const ScheduleContent = () => (_jsx("div", { className: "schedule-grid", children: daysOfWeek.map(day => (_jsxs("div", { className: "schedule-day", children: [_jsx("h2", { className: "day-title", children: day.name }), _jsxs("div", { className: "schedule-lessons", children: [getScheduleForDay(day.value).map((item, index) => (_jsxs("div", { className: `schedule-lesson ${item.is_canceled ? 'canceled' : ''} ${item.is_changed ? 'changed' : ''} ${item.is_added ? 'added' : ''} ${item.subject_name == "Нет урока" ? 'none' : ''}`, children: [_jsx("div", { className: "lesson-time", children: getLessonTime(item.lesson_number) }), _jsx("div", { className: "lesson-subject", children: item.subject_name }), item.room && (_jsxs("div", { className: "lesson-class", children: ["\u041A\u043B\u0430\u0441\u0441: ", item.class_name] })), userRole !== 'teacher' && (_jsx("div", { className: "lesson-teacher", children: item.teacher_name })), item.room && (_jsxs("div", { className: "lesson-room", children: ["\u041A\u0430\u0431\u0438\u043D\u0435\u0442: ", item.room] })), getChangeDisplay(item), userRole === 'admin' && !item.is_changed && !item.is_canceled && !item.is_added && !(item.subject_name == "Нет урока") && (_jsx("button", { className: "btn-delete-lesson", onClick: () => handleDeleteSchedule(item.id), children: "\u2715" })), userRole === 'admin' && (item.is_changed || item.is_canceled || item.is_added) && (_jsx("button", { className: "btn-delete-change", onClick: () => handleDeleteChange(item.id), children: "\u041E\u0442\u043C\u0435\u043D\u0438\u0442\u044C \u0437\u0430\u043C\u0435\u043D\u0443" }))] }, `${day.value}-${item.id}-${index}`))), getScheduleForDay(day.value).length === 0 && (_jsx("div", { className: "no-lessons", children: "\u041D\u0435\u0442 \u0443\u0440\u043E\u043A\u043E\u0432" }))] })] }, day.value))) }));
    return (_jsxs("div", { className: "schedule-container", children: [_jsx("h1", { className: "page-title", children: userRole === 'teacher' ? 'Мое расписание' : 'Расписание занятий' }), _jsxs("div", { className: "controls-row", children: [_jsxs("div", { className: "class-selector-mini", children: [_jsx("label", { className: "filter-label", children: "\u041A\u043B\u0430\u0441\u0441:" }), _jsx("select", { className: "filter-select", value: selectedClass || '', onChange: (e) => setSelectedClass(Number(e.target.value)), children: classes.map((classItem) => (_jsxs("option", { value: classItem.id, children: [classItem.name, " ", classItem.year ? `(${classItem.year})` : ''] }, classItem.id))) })] }), userRole === 'admin' && (_jsxs(_Fragment, { children: [_jsx("button", { className: "btn-primary add-btn", onClick: () => setShowAddModal(true), children: "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0443\u0440\u043E\u043A" }), _jsxs("div", { className: "date-selector", children: [_jsx("button", { className: "btn-secondary change-btn", onClick: () => setShowChangeModal(true), children: "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0437\u0430\u043C\u0435\u043D\u0443" }), _jsx("label", { className: "date-label", children: "\u0414\u0430\u0442\u0430:" }), _jsx("input", { type: "date", className: "date-input", value: selectedDate, onChange: (e) => setSelectedDate(e.target.value) })] })] }))] }), _jsx(ScheduleContent, {}), showAddModal && userRole === 'admin' && (_jsx("div", { className: "modal-overlay", children: _jsxs("div", { className: "modal-content", children: [_jsx("h2", { children: "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0443\u0440\u043E\u043A \u0432 \u0440\u0430\u0441\u043F\u0438\u0441\u0430\u043D\u0438\u0435" }), _jsxs("form", { onSubmit: handleAddSchedule, children: [_jsxs("div", { className: "form-group", children: [_jsx("label", { children: "\u041A\u043B\u0430\u0441\u0441" }), _jsxs("select", { value: formData.class_id, onChange: (e) => setFormData({ ...formData, class_id: parseInt(e.target.value) }), required: true, children: [_jsx("option", { value: "", children: "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043A\u043B\u0430\u0441\u0441" }), classes.map(classItem => (_jsx("option", { value: classItem.id, children: classItem.name }, classItem.id)))] })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "\u0414\u0435\u043D\u044C \u043D\u0435\u0434\u0435\u043B\u0438" }), _jsx("select", { value: formData.day_of_week, onChange: (e) => setFormData({ ...formData, day_of_week: parseInt(e.target.value) }), required: true, children: daysOfWeek.map(day => (_jsx("option", { value: day.value, children: day.name }, day.value))) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "\u041D\u043E\u043C\u0435\u0440 \u0443\u0440\u043E\u043A\u0430" }), _jsx("select", { value: formData.lesson_number, onChange: (e) => setFormData({ ...formData, lesson_number: parseInt(e.target.value) }), required: true, children: lessonTimes.map(lt => (_jsxs("option", { value: lt.lesson_number, children: [lt.lesson_number, " \u0443\u0440\u043E\u043A (", lt.start_time.slice(0, 5), " - ", lt.end_time.slice(0, 5), ")"] }, lt.lesson_number))) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "\u041F\u0440\u0435\u0434\u043C\u0435\u0442" }), _jsxs("select", { value: formData.subject_id, onChange: (e) => setFormData({ ...formData, subject_id: parseInt(e.target.value) }), required: true, children: [_jsx("option", { value: "", children: "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043F\u0440\u0435\u0434\u043C\u0435\u0442" }), subjects.map(subject => (_jsx("option", { value: subject.id, children: subject.name }, subject.id)))] })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "\u041A\u0430\u0431\u0438\u043D\u0435\u0442" }), _jsx("input", { type: "text", value: formData.room, onChange: (e) => setFormData({ ...formData, room: e.target.value }), placeholder: "\u041D\u0430\u043F\u0440\u0438\u043C\u0435\u0440: 201" })] }), _jsxs("div", { className: "modal-buttons", children: [_jsx("button", { type: "button", onClick: () => setShowAddModal(false), children: "\u041E\u0442\u043C\u0435\u043D\u0430" }), _jsx("button", { type: "submit", children: "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C" })] })] })] }) })), showChangeModal && userRole === 'admin' && (_jsx("div", { className: "modal-overlay", children: _jsxs("div", { className: "modal-content", children: [_jsxs("h2", { children: ["\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0437\u0430\u043C\u0435\u043D\u0443 \u043D\u0430 ", new Date(selectedDate).toLocaleDateString('ru-RU')] }), _jsxs("form", { onSubmit: handleAddChange, children: [_jsxs("div", { className: "form-group", children: [_jsx("label", { children: "\u0422\u0438\u043F \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u044F" }), _jsxs("select", { value: changeData.change_type, onChange: (e) => setChangeData({ ...changeData, change_type: e.target.value }), required: true, children: [_jsx("option", { value: "replace", children: "\u0417\u0430\u043C\u0435\u043D\u0430 \u0443\u0440\u043E\u043A\u0430" }), _jsx("option", { value: "cancel", children: "\u041E\u0442\u043C\u0435\u043D\u0430 \u0443\u0440\u043E\u043A\u0430" }), _jsx("option", { value: "added", children: "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0443\u0440\u043E\u043A" })] })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "\u041D\u043E\u043C\u0435\u0440 \u0443\u0440\u043E\u043A\u0430" }), _jsx("select", { value: changeData.lesson_number, onChange: (e) => setChangeData({ ...changeData, lesson_number: parseInt(e.target.value) }), required: true, children: lessonTimes.map(lt => (_jsxs("option", { value: lt.lesson_number, children: [lt.lesson_number, " \u0443\u0440\u043E\u043A (", lt.start_time.slice(0, 5), " - ", lt.end_time.slice(0, 5), ")"] }, lt.lesson_number))) })] }), changeData.change_type !== 'cancel' && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "form-group", children: [_jsx("label", { children: "\u041F\u0440\u0435\u0434\u043C\u0435\u0442" }), _jsxs("select", { value: changeData.subject_id, onChange: (e) => setChangeData({ ...changeData, subject_id: parseInt(e.target.value) }), required: true, children: [_jsx("option", { value: "", children: "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043F\u0440\u0435\u0434\u043C\u0435\u0442" }), subjects.map(subject => (_jsx("option", { value: subject.id, children: subject.name }, subject.id)))] })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "\u041A\u0430\u0431\u0438\u043D\u0435\u0442" }), _jsx("input", { type: "text", value: changeData.room, onChange: (e) => setChangeData({ ...changeData, room: e.target.value }), placeholder: "\u041D\u0430\u043F\u0440\u0438\u043C\u0435\u0440: 201" })] })] })), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "\u041F\u0440\u0438\u043C\u0435\u0447\u0430\u043D\u0438\u0435" }), _jsx("textarea", { value: changeData.notes, onChange: (e) => setChangeData({ ...changeData, notes: e.target.value }), placeholder: "\u041D\u0430\u043F\u0440\u0438\u043C\u0435\u0440: \u0423\u0440\u043E\u043A \u043F\u0435\u0440\u0435\u043D\u0435\u0441\u0435\u043D \u0432 \u043A\u0430\u0431\u0438\u043D\u0435\u0442 201", rows: 2 })] }), _jsxs("div", { className: "modal-buttons", children: [_jsx("button", { type: "button", onClick: () => setShowChangeModal(false), children: "\u041E\u0442\u043C\u0435\u043D\u0430" }), _jsx("button", { type: "submit", children: "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u0437\u0430\u043C\u0435\u043D\u0443" })] })] })] }) })), _jsx("style", { children: `
      .controls-row {
        display: flex;
        gap: 16px;
        margin-bottom: 24px;
        flex-wrap: wrap;
        align-items: flex-end;
        background: #f9fafb;
        padding: 12px 20px;
        border-radius: 12px;
      align-items: stretch;
}

      .class-selector-mini {
        min-width: 180px;
      }

      .filter-label {
        display: block;
        font-size: 12px;
        font-weight: 500;
        color: #6b7280;
        margin-bottom: 4px;
      }

      .filter-select {
        width: 100%;
        padding: 8px 12px;
        border: 1px solid #d1d5db;
        border-radius: 8px;
        font-size: 14px;
        background: white;
        color: black;
        cursor: pointer;
      }

      .date-selector {
        display: flex;
        gap: 8px;
        align-items: center;
        background: white;
        padding: 4px 16px;
        border-radius: 8px;
        border: 1px solid #e5e7eb;
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
        background: white;
        color: black;
      }

      .btn-primary {
        background-color: #3b82f6;
        color: white;
        padding: 8px 16px;
        border-radius: 8px;
        border: none;
        cursor: pointer;
        font-size: 14px;
        margin: auto 0;
      }

      .btn-primary:hover {
        background-color: #2563eb;
      }

      .btn-secondary {
        background-color: #10b981;
        color: white;
        padding: 8px 16px;
        border-radius: 8px;
        border: none;
        cursor: pointer;
        font-size: 14px;
        margin: auto 0;
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

      .schedule-lesson.none {
        background: #d3d2d2;
        border-left: 4px solid #707070;
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
        max-width: 100%;
        margin: 0 auto;
      }
      
      .page-title {
        font-size: 24px;
        font-weight: 600;
        color: #374151;
        margin-bottom: 20px;
      }
      
      .schedule-grid {
        display: flex;
        gap: 20px;
        overflow-x: auto;
      }
      
      .schedule-day {
        background: white;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        min-width: 280px;
        flex: 1;
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
        color: black;
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

      .form-group textarea {
        display: block;
        font-size: 14px;
        font-weight: 500;
        color: #000000;
        background: white;
        max-width: 100%;
        max-height: 100px;
        margin-bottom: 6px;
      }
      
      .form-group select,
      .form-group input {
        background: white;
        color: black;
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
        color: black;
        border: 1px solid #d1d5db;
      }
      
      .modal-buttons button:last-child {
        background: #3b82f6;
        color: white;
        border: none;
      }
      
      @media (max-width: 768px) {
        .schedule-grid {
          flex-direction: column;
        }
        
        .controls-row {
          flex-direction: column;
          align-items: stretch;
        }
      }
      ` })] }));
}
export default SchedulePage;
