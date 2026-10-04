import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
const normalizeDate = (date) => {
    if (!date)
        return '';
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return date;
    }
    if (date.includes('T')) {
        return date.split('T')[0];
    }
    const parsed = new Date(date);
    if (isNaN(parsed.getTime()))
        return '';
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};
const getMonthDatesFilteredByDays = (referenceDate = new Date(), allowedDays) => {
    const year = referenceDate.getFullYear();
    const month = referenceDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const dates = [];
    for (let i = 1; i <= daysInMonth; i++) {
        const date = new Date(year, month, i);
        let jsDay = date.getDay();
        if (jsDay === 0)
            jsDay = 7;
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
    const [userRole, setUserRole] = useState(null);
    const [classes, setClasses] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [selectedClass, setSelectedClass] = useState(null);
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [monthDates, setMonthDates] = useState([]);
    const [studentsGrades, setStudentsGrades] = useState([]);
    const [scheduleDays, setScheduleDays] = useState([]);
    const [lessonTimes, setLessonTimes] = useState([]);
    const [editingCell, setEditingCell] = useState(null);
    const [editValue, setEditValue] = useState('');
    const [hoveredColumn, setHoveredColumn] = useState(null);
    const [hoveredRow, setHoveredRow] = useState(null);
    const [hoveredCell, setHoveredCell] = useState(null);
    const [showReplacementModal, setShowReplacementModal] = useState(false);
    const [replacementDate, setReplacementDate] = useState(new Date().toISOString().split('T')[0]);
    const [replacementLessonNumber, setReplacementLessonNumber] = useState(1);
    const [replacementRoom, setReplacementRoom] = useState('');
    const [replacementNotes, setReplacementNotes] = useState('');
    const [replacementDates, setReplacementDates] = useState(new Set());
    const [replacementMap, setReplacementMap] = useState(new Map());
    const [replacementLessonType, setReplacementLessonType] = useState('lecture');
    const isStaff = userRole === 'teacher' || userRole === 'admin';
    const handleCellMouseEnter = (rowIndex, colIndex) => {
        setHoveredCell({ row: rowIndex, col: colIndex });
        setHoveredRow(rowIndex);
        setHoveredColumn(colIndex);
    };
    const handleCellMouseLeave = () => {
        setHoveredCell(null);
        setHoveredRow(null);
        setHoveredColumn(null);
    };
    const handleColumnMouseEnter = (index) => {
        setHoveredColumn(index);
    };
    const handleColumnMouseLeave = () => {
        setHoveredColumn(null);
    };
    const handleRowMouseEnter = (index) => {
        setHoveredRow(index);
    };
    const handleRowMouseLeave = () => {
        setHoveredRow(null);
    };
    const handleDeleteReplacement = async (date) => {
        if (!selectedClass || !selectedSubject)
            return;
        const changeData = replacementMap.get(date);
        if (!changeData) {
            alert('Замена не найдена');
            return;
        }
        if (!confirm(`Удалить замену на ${new Date(date).toLocaleDateString('ru-RU')}?`))
            return;
        try {
            const response = await fetch(`/api/schedule/changes/${changeData.id}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            if (response.ok) {
                alert('Замена успешно удалена');
                if (selectedClass && selectedSubject) {
                    loadTeacherGradebookData();
                }
            }
            else {
                const error = await response.json();
                alert(error.message || 'Ошибка удаления замены');
            }
        }
        catch (error) {
            console.error('Delete replacement error:', error);
            alert('Ошибка удаления замены');
        }
    };
    const handleAddReplacement = async (e) => {
        e.preventDefault();
        if (!selectedClass || !selectedSubject) {
            alert('Выберите класс и предмет');
            return;
        }
        try {
            const response = await fetch('/api/schedule/changes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    class_id: selectedClass,
                    subject_id: selectedSubject,
                    lesson_number: replacementLessonNumber,
                    date: replacementDate,
                    room: replacementRoom,
                    change_type: 'replace',
                    lesson_type: replacementLessonType,
                    notes: replacementNotes
                }),
                credentials: 'include'
            });
            if (response.ok) {
                setShowReplacementModal(false);
                setReplacementDate(new Date().toISOString().split('T')[0]);
                setReplacementLessonNumber(1);
                setReplacementRoom('');
                setReplacementLessonType('lecture');
                setReplacementNotes('');
                alert('Замена успешно добавлена');
                if (selectedClass && selectedSubject) {
                    loadTeacherGradebookData();
                }
            }
            else {
                const error = await response.json();
                alert(error.message || 'Ошибка добавления замены');
            }
        }
        catch (error) {
            console.error('Add replacement error:', error);
            alert('Ошибка добавления замены');
        }
    };
    useEffect(() => {
        checkAuth();
    }, []);
    useEffect(() => {
        if (isStaff && selectedClass && selectedSubject) {
            loadTeacherGradebookData();
        }
    }, [selectedClass, selectedSubject, userRole]);
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
                }
                else {
                    await loadStudentData();
                }
            }
            else {
                navigate('/login');
            }
        }
        catch (error) {
            console.error('Auth check error:', error);
            navigate('/login');
        }
        finally {
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
        }
        catch (error) {
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
        }
        catch (error) {
            console.error('Load lesson times error:', error);
        }
    };
    const loadTeacherGradebookData = async () => {
        if (!selectedClass || !selectedSubject)
            return;
        try {
            const scheduleResponse = await fetch(`/api/gradebook/schedule/class/${selectedClass}`, {
                credentials: 'include'
            });
            let uniqueDays = [];
            let scheduleMap = new Map();
            if (scheduleResponse.ok) {
                const data = await scheduleResponse.json();
                const schedule = data.schedule || [];
                schedule.forEach((item) => {
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
            const changesResponse = await fetch(`/api/gradebook/changes/class/${selectedClass}/subject/${selectedSubject}?start=${startDate}&end=${endDate}`, { credentials: 'include' });
            let changeDates = [];
            let changesMap = new Map();
            if (changesResponse.ok) {
                const changesData = await changesResponse.json();
                const changes = changesData.changes || [];
                const replacementInfoMap = new Map();
                changes.forEach((change) => {
                    if (change.change_type === 'replace') {
                        const changeDate = normalizeDate(change.date);
                        replacementInfoMap.set(changeDate, {
                            id: change.id,
                            lesson_type: change.lesson_type || 'lecture'
                        });
                    }
                });
                setReplacementMap(replacementInfoMap);
                const replacementDatesSet = new Set();
                changes.forEach((change) => {
                    if (change.change_type === 'replace') {
                        const changeDate = normalizeDate(change.date);
                        replacementDatesSet.add(changeDate);
                    }
                });
                setReplacementDates(replacementDatesSet);
                changes.forEach((change) => {
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
            if (!studentsRes.ok)
                return;
            const studentsData = await studentsRes.json();
            const studentsList = studentsData.students || [];
            const studentsWithRawRecords = await Promise.all(studentsList.map(async (student) => {
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
            }));
            const studentsWithGrades = studentsWithRawRecords.map(({ student, grades, attendance }) => {
                return {
                    student,
                    grades: monthDateList.map((date) => {
                        const grade = grades.find((g) => normalizeDate(g.grade_date) === date);
                        const attendanceItem = attendance.find((a) => normalizeDate(a.date) === date);
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
        }
        catch (error) {
            console.error('Load teacher gradebook error:', error);
        }
    };
    const findClosestLesson = (createdTime, lessonTimes, scheduleForDay) => {
        if (!lessonTimes.length)
            return null;
        const [createdHour, createdMinute] = createdTime.split(':').map(Number);
        const createdTotalMinutes = createdHour * 60 + createdMinute;
        if (scheduleForDay && scheduleForDay.length > 0) {
            let closestScheduleItem = null;
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
                return { lesson: lesson, lateMinutes: minDifference };
            }
        }
        let closestLesson = null;
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
            let lessonTimesList = [];
            if (lessonTimesRes.ok) {
                const lessonTimesData = await lessonTimesRes.json();
                lessonTimesList = lessonTimesData.lesson_times || [];
                setLessonTimes(lessonTimesList);
            }
            const subjectsWithGrades = await Promise.all(subjectsList.map(async (subject) => {
                const [gradesRes, attendanceRes] = await Promise.all([
                    fetch(`/api/gradebook/grades/subject/${subject.id}`, { credentials: 'include' }),
                    fetch(`/api/gradebook/attendance/subject/${subject.id}`, { credentials: 'include' })
                ]);
                const gradesData = await gradesRes.json();
                const attendanceData = await attendanceRes.json();
                const gradesMap = new Map();
                (gradesData.grades || []).forEach((g) => {
                    const normalizedDate = normalizeDate(g.grade_date);
                    gradesMap.set(normalizedDate, g);
                });
                const attendanceMap = new Map();
                (attendanceData.attendance || []).forEach((a) => {
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
            }));
            setStudentsGrades(subjectsWithGrades);
        }
        catch (error) {
            console.error('Load student data error:', error);
        }
    };
    const updateCellValue = async (studentId, date, type, value) => {
        if (!selectedSubject)
            return;
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
            }
            else if (type === 'late') {
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
            }
            else if (type === 'grade' && value) {
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
            }
            else if (type === 'clear') {
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
        }
        catch (error) {
            console.error('Update error:', error);
            alert('Ошибка при сохранении');
        }
    };
    const handleCellClick = (studentId, date, currentValue, isAbsent, isLate) => {
        if (!isStaff)
            return;
        if (currentValue !== null || isAbsent || isLate) {
            updateCellValue(studentId, date, 'clear');
        }
        else {
            setEditingCell({ studentId, date });
            setEditValue('');
        }
    };
    const handleCellContextMenu = async (e, studentId, date, isAbsent) => {
        e.preventDefault();
        if (!isStaff)
            return;
        if (isAbsent) {
            await updateCellValue(studentId, date, 'clear');
        }
        else {
            await updateCellValue(studentId, date, 'absent');
        }
    };
    const handleCellMiddleClick = async (e, studentId, date, isLate) => {
        e.preventDefault();
        if (!isStaff)
            return;
        if (isLate) {
            await updateCellValue(studentId, date, 'clear');
        }
        else {
            await updateCellValue(studentId, date, 'late');
        }
    };
    const handleCellSave = async () => {
        if (!editingCell || !selectedSubject)
            return;
        const { studentId, date } = editingCell;
        const value = editValue.trim();
        if (value && !isNaN(parseInt(value)) && parseInt(value) >= 1 && parseInt(value) <= 10) {
            await updateCellValue(studentId, date, 'grade', value);
        }
        else if (value === 'н' || value === 'Н') {
            await updateCellValue(studentId, date, 'absent');
        }
        else if (value === 'о' || value === 'О') {
            await updateCellValue(studentId, date, 'late');
        }
        else if (value !== '') {
            alert('Оценка должна быть от 1 до 10, "н" для отсутствия или "о" для опоздания');
            setEditingCell(null);
            return;
        }
        setEditingCell(null);
    };
    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleCellSave();
        }
        else if (e.key === 'Escape') {
            setEditingCell(null);
        }
    };
    const getCellContent = (grade, isAbsent, isLate, lateMinutes) => {
        if (isAbsent)
            return 'н';
        if (isLate) {
            if (lateMinutes && lateMinutes > 0) {
                return `о (${lateMinutes})`;
            }
            return 'о';
        }
        if (grade !== null)
            return grade.toString();
        return '';
    };
    const getCellClass = (grade, isAbsent, isLate, isEditing) => {
        if (isEditing)
            return 'grade-cell editing';
        if (isAbsent)
            return 'grade-cell absent';
        if (isLate)
            return 'grade-cell late';
        if (grade !== null) {
            if (grade >= 9)
                return 'grade-cell excellent';
            if (grade >= 7)
                return 'grade-cell good';
            if (grade >= 4)
                return 'grade-cell satisfactory';
            return 'grade-cell poor';
        }
        return 'grade-cell empty';
    };
    if (loading) {
        return _jsx("div", { className: "loading", children: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430..." });
    }
    if (isStaff) {
        return (_jsxs("div", { className: "gradebook", children: [_jsx("h1", { className: "gradebook-title", children: "\u041A\u043B\u0430\u0441\u0441\u043D\u044B\u0439 \u0436\u0443\u0440\u043D\u0430\u043B" }), _jsxs("div", { className: "filters", children: [_jsxs("div", { className: "filter-group", children: [_jsx("label", { className: "filter-label", children: "\u041A\u043B\u0430\u0441\u0441" }), _jsxs("select", { className: "filter-select", value: selectedClass || '', onChange: (e) => setSelectedClass(Number(e.target.value)), children: [_jsx("option", { value: "", children: "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043A\u043B\u0430\u0441\u0441" }), classes.map((classItem) => (_jsxs("option", { value: classItem.id, children: [classItem.name, " (\u0432\u044B\u043F\u0443\u0441\u043A ", classItem.year, ")"] }, classItem.id)))] })] }), _jsxs("div", { className: "filter-group", children: [_jsx("label", { className: "filter-label", children: "\u041F\u0440\u0435\u0434\u043C\u0435\u0442" }), _jsxs("select", { className: "filter-select", value: selectedSubject || '', onChange: (e) => setSelectedSubject(Number(e.target.value)), disabled: !selectedClass, children: [_jsx("option", { value: "", children: "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043F\u0440\u0435\u0434\u043C\u0435\u0442" }), subjects.map((subject) => (_jsx("option", { value: subject.id, children: subject.name }, subject.id)))] })] })] }), selectedClass && selectedSubject && (userRole === 'admin' || userRole === 'teacher') && (_jsxs("div", { className: "course-program-link", children: [_jsx("button", { className: "btn-replacement", onClick: () => setShowReplacementModal(true), style: { marginLeft: '12px' }, children: "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0443\u0440\u043E\u043A" }), _jsx("button", { className: "btn-course", onClick: () => navigate(`/course/${selectedSubject}/${selectedClass}`), children: "\u041F\u0440\u043E\u0433\u0440\u0430\u043C\u043C\u0430 \u043A\u0443\u0440\u0441\u0430" })] })), selectedClass && selectedSubject && monthDates.length > 0 && studentsGrades.length > 0 && (_jsx("div", { className: "gradebook-table-wrapper", children: _jsxs("table", { className: "gradebook-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { className: "index-column", children: "\u041D\u043E\u043C\u0435\u0440" }), _jsx("th", { className: "student-column", children: "\u0423\u0447\u0435\u043D\u0438\u043A" }), monthDates.map((date, index) => {
                                            const hasReplacement = replacementDates.has(date);
                                            const replacementData = replacementMap.get(date);
                                            const lessonTypeText = replacementData?.lesson_type
                                                ? {
                                                    'lecture': 'Лекция',
                                                    'lab': 'Лабораторная',
                                                    'practice': 'Практика',
                                                    'control': 'Контрольная',
                                                    'exam': 'Экзамен'
                                                }[replacementData.lesson_type] || ''
                                                : '';
                                            const tooltipText = hasReplacement && lessonTypeText
                                                ? `${date} ${lessonTypeText}`
                                                : date;
                                            return (_jsxs("th", { className: `date-column ${hoveredColumn === index ? 'column-hover' : ''} ${hoveredCell?.col === index ? 'column-hover' : ''} ${hasReplacement ? 'has-replacement' : ''}`, title: tooltipText, onMouseEnter: () => handleColumnMouseEnter(index), onMouseLeave: handleColumnMouseLeave, onContextMenu: (e) => {
                                                    e.preventDefault();
                                                    if (hasReplacement) {
                                                        handleDeleteReplacement(date);
                                                    }
                                                    else {
                                                        alert('На эту дату нет замены');
                                                    }
                                                }, children: [new Date(date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }), hasReplacement && (_jsxs("span", { className: "replacement-indicator", children: [replacementData?.lesson_type === 'lecture', replacementData?.lesson_type === 'lab', replacementData?.lesson_type === 'practice', replacementData?.lesson_type === 'control', replacementData?.lesson_type === 'exam'] }))] }, index));
                                        })] }) }), _jsx("tbody", { children: studentsGrades.map(({ student, grades }, studentIndex) => (_jsxs("tr", { className: `${student.isfired ? 'fired-student' : ''} ${hoveredRow === studentIndex ? 'row-hover' : ''} ${hoveredCell?.row === studentIndex ? 'row-hover' : ''}`, onMouseEnter: () => handleRowMouseEnter(studentIndex), onMouseLeave: handleRowMouseLeave, children: [_jsx("td", { className: "student-index-cell", children: studentIndex + 1 }), _jsx("td", { className: "student-cell", children: student.name }), grades.map((gradeRecord, idx) => {
                                            const isEditing = editingCell?.studentId === student.id && editingCell?.date === gradeRecord.date;
                                            const content = getCellContent(gradeRecord.grade, gradeRecord.isAbsent, gradeRecord.isLate, gradeRecord.lateMinutes);
                                            const isColumnHovered = hoveredColumn === idx;
                                            const isCellHovered = hoveredCell?.row === studentIndex && hoveredCell?.col === idx;
                                            return (_jsx("td", { className: `${getCellClass(gradeRecord.grade, gradeRecord.isAbsent, gradeRecord.isLate, isEditing)} ${isColumnHovered ? 'column-hover' : ''} ${isCellHovered ? 'column-hover' : ''}`, onMouseEnter: () => handleCellMouseEnter(studentIndex, idx), onMouseLeave: handleCellMouseLeave, onClick: () => handleCellClick(student.id, gradeRecord.date, gradeRecord.grade, gradeRecord.isAbsent, gradeRecord.isLate), onContextMenu: (e) => handleCellContextMenu(e, student.id, gradeRecord.date, gradeRecord.isAbsent), onAuxClick: (e) => {
                                                    if (e.button === 1) {
                                                        handleCellMiddleClick(e, student.id, gradeRecord.date, gradeRecord.isLate);
                                                    }
                                                }, children: isEditing ? (_jsx("input", { type: "text", className: "grade-input", value: editValue, onChange: (e) => setEditValue(e.target.value), onBlur: handleCellSave, onKeyDown: handleKeyDown, autoFocus: true, maxLength: 2 })) : (content) }, idx));
                                        })] }, student.id))) })] }) })), _jsxs("div", { className: "gradebook-footer", children: [_jsxs("div", { className: "legend", children: [_jsx("span", { className: "legend-title", children: "\u0423\u0441\u043B\u043E\u0432\u043D\u044B\u0435 \u043E\u0431\u043E\u0437\u043D\u0430\u0447\u0435\u043D\u0438\u044F:" }), _jsxs("div", { className: "legend-items", children: [_jsx("span", { className: "legend-excellent", children: "9-10" }), _jsx("span", { className: "legend-good", children: "7-8" }), _jsx("span", { className: "legend-satisfactory", children: "4-6" }), _jsx("span", { className: "legend-poor", children: "1-3" }), _jsx("span", { className: "legend-absent", children: "\u043D (\u043E\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0438\u0435)" }), _jsx("span", { className: "legend-late", children: "\u043E (\u043E\u043F\u043E\u0437\u0434\u0430\u043D\u0438\u0435)" }), _jsx("span", { className: "legend-empty", children: "-" })] })] }), _jsx("div", { className: "hint", children: "\u041B\u0435\u0432\u0430\u044F \u043A\u043D\u043E\u043F\u043A\u0430 - \u0432\u0432\u043E\u0434 \u043E\u0446\u0435\u043D\u043A\u0438 | \u041F\u0440\u0430\u0432\u0430\u044F \u043A\u043D\u043E\u043F\u043A\u0430 - \u043E\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0438\u0435 (\u043D) | \u0421\u0440\u0435\u0434\u043D\u044F\u044F \u043A\u043D\u043E\u043F\u043A\u0430 - \u043E\u043F\u043E\u0437\u0434\u0430\u043D\u0438\u0435 (\u043E)" })] }), showReplacementModal && (_jsx("div", { className: "modal-overlay", children: _jsxs("div", { className: "modal-content", children: [_jsx("h2", { children: "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0443\u0440\u043E\u043A" }), _jsxs("p", { style: { marginBottom: '16px', color: '#6b7280' }, children: ["\u041F\u0440\u0435\u0434\u043C\u0435\u0442: ", subjects.find(s => s.id === selectedSubject)?.name] }), _jsxs("form", { onSubmit: handleAddReplacement, children: [_jsxs("div", { className: "form-group", children: [_jsx("label", { children: "\u0414\u0430\u0442\u0430" }), _jsx("input", { type: "date", value: replacementDate, onChange: (e) => setReplacementDate(e.target.value), required: true })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "\u041D\u043E\u043C\u0435\u0440 \u0443\u0440\u043E\u043A\u0430" }), _jsx("select", { value: replacementLessonNumber, onChange: (e) => setReplacementLessonNumber(parseInt(e.target.value)), required: true, children: lessonTimes.map(lt => (_jsxs("option", { value: lt.lesson_number, children: [lt.lesson_number, " \u0443\u0440\u043E\u043A (", lt.start_time.slice(0, 5), " - ", lt.end_time.slice(0, 5), ")"] }, lt.lesson_number))) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "\u0422\u0438\u043F \u0443\u0440\u043E\u043A\u0430" }), _jsxs("select", { value: replacementLessonType, onChange: (e) => setReplacementLessonType(e.target.value), required: true, children: [_jsx("option", { value: "lecture", children: "\u041B\u0435\u043A\u0446\u0438\u044F" }), _jsx("option", { value: "lab", children: "\u041B\u0430\u0431\u043E\u0440\u0430\u0442\u043E\u0440\u043D\u0430\u044F" }), _jsx("option", { value: "practice", children: "\u041F\u0440\u0430\u043A\u0442\u0438\u043A\u0430" }), _jsx("option", { value: "control", children: "\u041A\u043E\u043D\u0442\u0440\u043E\u043B\u044C\u043D\u0430\u044F" }), _jsx("option", { value: "exam", children: "\u042D\u043A\u0437\u0430\u043C\u0435\u043D" })] })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "\u041A\u0430\u0431\u0438\u043D\u0435\u0442 (\u043D\u0435\u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u043E)" }), _jsx("input", { type: "text", value: replacementRoom, onChange: (e) => setReplacementRoom(e.target.value), placeholder: "\u041D\u0430\u043F\u0440\u0438\u043C\u0435\u0440: 201" })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "\u041F\u0440\u0438\u043C\u0435\u0447\u0430\u043D\u0438\u0435 (\u043D\u0435\u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u043E)" }), _jsx("textarea", { value: replacementNotes, onChange: (e) => setReplacementNotes(e.target.value), placeholder: "\u041D\u0430\u043F\u0440\u0438\u043C\u0435\u0440: \u0423\u0440\u043E\u043A \u043F\u0435\u0440\u0435\u043D\u0435\u0441\u0435\u043D \u0432 \u043A\u0430\u0431\u0438\u043D\u0435\u0442 201", rows: 2 })] }), _jsxs("div", { className: "modal-buttons", children: [_jsx("button", { type: "button", onClick: () => setShowReplacementModal(false), children: "\u041E\u0442\u043C\u0435\u043D\u0430" }), _jsx("button", { type: "submit", children: "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u0437\u0430\u043C\u0435\u043D\u0443" })] })] })] }) })), _jsx("style", { children: `

          .date-column {
            min-width: 60px;
            cursor: pointer;
            position: relative;
          }

          .date-column.has-replacement {
            background-color: #fec7c7;
            border-bottom: 2px solid #bd9d9d;
          }

          .replacement-indicator {
            display: inline-block;
            margin-left: 4px;
            font-size: 10px;
          }

          .date-column:hover {
            background-color: #e5e7eb;
          }

          .date-column.has-replacement:hover {
            background-color: #dfb5b5;
          }

        .course-program-link{
          display: flex;
          align-items: flex-start;
          justify-content: flex-start;
         }
        .btn-replacement {
            background-color: #10b981;
            color: white;
            padding: 8px 16px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            margin-right: 10px;
          }

          .btn-replacement:hover {
            background-color: #059669;
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
            width: 450px;
            max-width: 90%;
          }

          .modal-content h2 {
            font-size: 20px;
            margin-bottom: 20px;
            color: #1f2937;
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

          .form-group input,
          .form-group select,
          .form-group textarea {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid #d1d5db;
            border-radius: 8px;
            font-size: 14px;
            background: white;
            color: #1f2937;
            box-sizing: border-box;
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
            color: #374151;
            border: 1px solid #d1d5db;
          }

          .modal-buttons button:last-child {
            background: #10b981;
            color: white;
            border: none;
          }

          .modal-buttons button:last-child:hover {
            background: #059669;
          }
          .gradebook { padding: 24px; max-width: 1400px; margin: 0 auto; }
          .gradebook-title { font-size: 24px; font-weight: 600; color: #1f2937; margin-bottom: 24px; }
          .filters { display: flex; gap: 20px; margin-bottom: 24px; flex-wrap: wrap; }
          .filter-group { flex: 1; min-width: 200px; }
          .filter-label { display: block; font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 6px; }
          .filter-select { width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; background: white; color: #1f2937; }
          .filter-select option { background: white; color: #1f2937; }
          .filter-select:disabled { background: #f9fafb; color: #9ca3af; }
          .gradebook-table-wrapper { overflow-x: auto; border-radius: 12px; border: 1px solid #e5e7eb; }
          .gradebook-table { width: 100%; border-collapse: collapse; font-size: 14px; min-width: 600px; }
          .gradebook-table th { background: #f3f4f6; padding: 12px 8px; text-align: center; font-weight: 600; color: #374151; border-bottom: 1px solid #e5e7eb; position: sticky; top: 0; }
          .gradebook-table td { padding: 8px; text-align: center; border-bottom: 1px solid #f0f0f0; }
          .student-column, .subject-column { position: sticky; left: 0; background: white; font-weight: 500; text-align: left; min-width: 75px; }
          .index-column, .subject-column { position: sticky; left: 0; background: white; font-weight: 500; text-align: left; min-width: 50px; }
          .student-cell, .subject-cell { background: white; font-weight: 500; text-align: left; border-right: 1px solid #e5e7eb; }
          .student-index-cell, .subject-cell { background: white; font-weight: 500; text-align: center; border-right: 1px solid #e5e7eb; }
          .date-column { min-width: 60px; }
          .grade-cell { cursor: pointer; transition: background 0.2s; font-weight: 500; pointer-events: auto; }
          .grade-cell:hover { background: #f3f4f6; }
          .grade-cell.editing { padding: 0; }
          .grade-cell.excellent { background: #dcfce7; color: #166534; }
          .grade-cell.good { background: #dbeafe; color: #1e40af; }
          .grade-cell.satisfactory { background: #fef3c7; color: #92400e; }
          .grade-cell.poor { background: #fee2e2; color: #991b1b; }
          .grade-cell.absent { background: #f3f4f6; color: #6b7280; }
          .grade-cell.late { background: #fed7aa; color: #c2410c; }
          .grade-cell.empty { background: white; color: #9ca3af; }
          .grade-input { width: 50px; padding: 8px; text-align: center; border: 2px solid #3b82f6; border-radius: 6px; font-size: 14px; outline: none; background: white; color: #1f2937; }
          .gradebook-footer { margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb; }
          .legend { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
          .legend-title { font-size: 14px; color: #6b7280; }
          .legend-items { display: flex; gap: 12px; flex-wrap: wrap; }
          .legend-items span { font-size: 12px; padding: 4px 8px; border-radius: 4px; }
          .legend-excellent { background: #dcfce7; color: #166534; }
          .legend-good { background: #dbeafe; color: #1e40af; }
          .legend-satisfactory { background: #fef3c7; color: #92400e; }
          .legend-poor { background: #fee2e2; color: #991b1b; }
          .legend-absent { background: #f3f4f6; color: #6b7280; }
          .legend-late { background: #fed7aa; color: #c2410c; }
          .legend-empty { background: white; color: #9ca3af; border: 1px solid #e5e7eb; }
          .hint { margin-top: 16px; font-size: 12px; color: #9ca3af; text-align: center; }
          .fired-student { color: #991b1b; background: #fee2e2; }
          .no-data { text-align: center; padding: 48px; color: #9ca3af; background: white; border-radius: 12px; }
          .loading { display: flex; justify-content: center; align-items: center; height: 200px; font-size: 16px; color: #6b7280; }
          @media (max-width: 768px) {
            .gradebook { padding: 16px; }
            .filters { flex-direction: column; gap: 12px; }
            .student-column, .subject-column { min-width: 120px; }
            .date-column { min-width: 50px; }
          }
          .btn-course { padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; margin-bottom: 16px; }
        ` })] }));
    }
    return (_jsxs("div", { className: "gradebook", children: [_jsx("h1", { className: "gradebook-title", children: "\u041C\u043E\u0439 \u0436\u0443\u0440\u043D\u0430\u043B" }), studentsGrades.length > 0 && monthDates.length > 0 ? (_jsx("div", { className: "gradebook-table-wrapper", children: _jsxs("table", { className: "gradebook-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { className: "subject-column", children: "\u041F\u0440\u0435\u0434\u043C\u0435\u0442" }), monthDates.map((date, index) => (_jsx("th", { className: `date-column ${hoveredCell?.col === index ? 'column-hover' : ''}`, title: date, children: new Date(date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) }, index)))] }) }), _jsx("tbody", { children: studentsGrades.map(({ student, grades }) => (_jsxs("tr", { children: [_jsx("td", { className: "subject-cell", children: student.name }), grades.map((gradeRecord, idx) => {
                                        const content = getCellContent(gradeRecord.grade, gradeRecord.isAbsent, gradeRecord.isLate, gradeRecord.lateMinutes);
                                        return (_jsx("td", { className: getCellClass(gradeRecord.grade, gradeRecord.isAbsent, gradeRecord.isLate, false), children: content }, idx));
                                    })] }, student.id))) })] }) })) : (_jsx("div", { className: "no-data", children: "\u041D\u0435\u0442 \u0434\u0430\u043D\u043D\u044B\u0445 \u043E\u0431 \u043E\u0446\u0435\u043D\u043A\u0430\u0445" })), _jsx("div", { className: "gradebook-footer", children: _jsxs("div", { className: "legend", children: [_jsx("span", { className: "legend-title", children: "\u0423\u0441\u043B\u043E\u0432\u043D\u044B\u0435 \u043E\u0431\u043E\u0437\u043D\u0430\u0447\u0435\u043D\u0438\u044F:" }), _jsxs("div", { className: "legend-items", children: [_jsx("span", { className: "legend-excellent", children: "9-10" }), _jsx("span", { className: "legend-good", children: "7-8" }), _jsx("span", { className: "legend-satisfactory", children: "4-6" }), _jsx("span", { className: "legend-poor", children: "1-3" }), _jsx("span", { className: "legend-absent", children: "\u043D (\u043E\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0438\u0435)" }), _jsx("span", { className: "legend-late", children: "\u043E (\u043E\u043F\u043E\u0437\u0434\u0430\u043D\u0438\u0435)" }), _jsx("span", { className: "legend-empty", children: "-" })] })] }) }), _jsx("style", { children: `
        .gradebook { padding: 24px; max-width: 1400px; margin: 0 auto; }
        .gradebook-title { font-size: 24px; font-weight: 600; color: #1f2937; margin-bottom: 24px; }
        .gradebook-table-wrapper { overflow-x: auto; border-radius: 12px; border: 1px solid #e5e7eb; }
        .gradebook-table { width: 100%; border-collapse: collapse; font-size: 14px; min-width: 600px; }
        .gradebook-table th { background: #f3f4f6; padding: 12px 8px; text-align: center; font-weight: 600; color: #374151; border-bottom: 1px solid #e5e7eb; position: sticky; top: 0; }
        .gradebook-table td { padding: 8px; text-align: center; border-bottom: 1px solid #f0f0f0; }
        .student-column, .subject-column { position: sticky; left: 0; background: white; font-weight: 500; text-align: left; min-width: 150px; }
        .date-column { min-width: 60px; }
        .grade-cell { cursor: pointer; transition: background 0.2s; font-weight: 500; pointer-events: auto; }
        .grade-cell:hover { background: #f3f4f6; }
        .grade-cell.excellent { background: #dcfce7; color: #166534; }
        .grade-cell.good { background: #dbeafe; color: #1e40af; }
        .grade-cell.satisfactory { background: #fef3c7; color: #92400e; }
        .grade-cell.poor { background: #fee2e2; color: #991b1b; }
        .grade-cell.absent { background: #f3f4f6; color: #6b7280; }
        .grade-cell.late { background: #fed7aa; color: #c2410c; }
        .grade-cell.empty { background: white; color: #9ca3af; }
        .gradebook-footer { margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb; }
        .legend { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
        .legend-title { font-size: 14px; color: #6b7280; }
        .legend-items { display: flex; gap: 12px; flex-wrap: wrap; }
        .legend-items span { font-size: 12px; padding: 4px 8px; border-radius: 4px; }
        .legend-excellent { background: #dcfce7; color: #166534; }
        .legend-good { background: #dbeafe; color: #1e40af; }
        .legend-satisfactory { background: #fef3c7; color: #92400e; }
        .legend-poor { background: #fee2e2; color: #991b1b; }
        .legend-absent { background: #f3f4f6; color: #6b7280; }
        .legend-late { background: #fed7aa; color: #c2410c; }
        .legend-empty { background: white; color: #9ca3af; border: 1px solid #e5e7eb; }
        .no-data { text-align: center; padding: 48px; color: #9ca3af; background: white; border-radius: 12px; }
        @media (max-width: 768px) {
          .gradebook { padding: 16px; }
          .student-column, .subject-column { min-width: 120px; }
          .date-column { min-width: 50px; }
        }
      ` })] }));
}
export default GradebookPage;
