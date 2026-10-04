import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { lessonTypeLabels, lessonTypeColors } from '../types/courseTypes';
function CourseProgramPage() {
    const { subjectId, classId } = useParams();
    const [loading, setLoading] = useState(true);
    const [program, setProgram] = useState(null);
    const [lessons, setLessons] = useState([]);
    const [subject, setSubject] = useState(null);
    const [classInfo, setClassInfo] = useState(null);
    const [showLessonModal, setShowLessonModal] = useState(false);
    const [showProgramModal, setShowProgramModal] = useState(false);
    const [editingLesson, setEditingLesson] = useState(null);
    const [viewMode, setViewMode] = useState('list');
    const [programForm, setProgramForm] = useState({
        total_hours: 0,
        description: ''
    });
    const [lessonForm, setLessonForm] = useState({
        lesson_number: 1,
        lesson_type: 'lecture',
        title: '',
        description: '',
        max_score: 10,
        requirements: ''
    });
    const [showTeamModal, setShowTeamModal] = useState(false);
    const [selectedLesson, setSelectedLesson] = useState(null);
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
            const foundSubject = subjectsData.subjects?.find((s) => s.id === Number(subjectId));
            setSubject(foundSubject || null);
            const classesRes = await fetch('/api/gradebook/classes', { credentials: 'include' });
            const classesData = await classesRes.json();
            const foundClass = classesData.classes?.find((c) => c.id === Number(classId));
            setClassInfo(foundClass || null);
        }
        catch (error) {
            console.error('Load data error:', error);
        }
        finally {
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
        }
        else {
            alert('Ошибка сохранения');
        }
    };
    const handleSaveLesson = async () => {
        if (!program) {
            alert('Сначала создайте программу курса');
            return;
        }
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
        }
        else {
            alert(result.message || 'Ошибка сохранения');
        }
    };
    const handleUpdateLesson = async () => {
        if (!editingLesson)
            return;
        if (lessonForm.lesson_number !== editingLesson.lesson_number) {
            const existingLesson = lessons.find(l => l.lesson_number === lessonForm.lesson_number && l.id !== editingLesson.id);
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
        }
        else {
            alert(result.message || 'Ошибка обновления');
        }
    };
    const handleDeleteLesson = async (id) => {
        if (!confirm('Удалить это занятие?'))
            return;
        const response = await fetch(`/api/course/lessons/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        const result = await response.json();
        if (result.success) {
            loadData();
        }
        else {
            alert('Ошибка удаления');
        }
    };
    const handleAddMaterial = async (lessonId) => {
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
        }
        else {
            alert('Ошибка добавления материала');
        }
    };
    const handleDeleteMaterial = async (materialId) => {
        if (!confirm('Удалить этот материал?'))
            return;
        const response = await fetch(`/api/course/materials/${materialId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        const result = await response.json();
        if (result.success) {
            loadData();
        }
        else {
            alert('Ошибка удаления материала');
        }
    };
    const fileInputRef = useRef(null);
    const handleExportProgram = async () => {
        if (!program) {
            alert('Нет программы для экспорта');
            return;
        }
        try {
            const XLSX = await import('xlsx');
            const progSheetData = [
                {
                    subjectId: Number(subjectId),
                    classId: Number(classId),
                    total_hours: program.total_hours || 0,
                    description: program.description || ''
                }
            ];
            const wsProg = XLSX.utils.json_to_sheet(progSheetData);
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
            XLSX.writeFile(wb, filename);
        }
        catch (err) {
            console.error('Export XLSX error', err);
            alert('Ошибка при экспорте в Excel. Установите пакет "xlsx" и обновите страницу.');
        }
    };
    const handleImportClick = () => {
        fileInputRef.current?.click();
    };
    const handleImportFile = async (e) => {
        const f = e.target.files?.[0];
        if (!f)
            return;
        try {
            const ab = await f.arrayBuffer();
            const XLSX = await import('xlsx');
            const wb = XLSX.read(ab, { type: 'array' });
            const progSheet = wb.Sheets['Program'] || wb.Sheets[wb.SheetNames[0]];
            const progArr = XLSX.utils.sheet_to_json(progSheet);
            const prog = progArr && progArr[0];
            if (!prog) {
                alert('Файл не содержит корректную программу (лист Program)');
                return;
            }
            if (program && !confirm('Текущая программа будет заменена. Продолжить?'))
                return;
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
            const lessonsSheet = wb.Sheets['Lessons'] || null;
            if (lessonsSheet) {
                const lessonsArr = XLSX.utils.sheet_to_json(lessonsSheet);
                const lessonNumbers = new Set();
                const duplicateNumbers = [];
                for (const l of lessonsArr) {
                    const lessonNumber = Number(l.lesson_number);
                    if (lessonNumbers.has(lessonNumber)) {
                        duplicateNumbers.push(lessonNumber);
                    }
                    else {
                        lessonNumbers.add(lessonNumber);
                    }
                }
                if (duplicateNumbers.length > 0) {
                    alert(`❌ Ошибка: В файле обнаружены дубликаты номеров занятий: ${duplicateNumbers.join(', ')}.\n\nКаждое занятие должно иметь уникальный номер. Исправьте файл и попробуйте снова.`);
                    return;
                }
                const sortedLessons = [...lessonsArr].sort((a, b) => Number(a.lesson_number) - Number(b.lesson_number));
                let importErrors = [];
                for (const l of sortedLessons) {
                    const lessonNumber = Number(l.lesson_number);
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
                }
                else {
                    alert('✅ Импорт из Excel завершён успешно.');
                }
            }
            else {
                alert('✅ Программа импортирована, но лист Lessons не найден.');
            }
            loadData();
        }
        catch (err) {
            console.error('Import XLSX error', err);
            alert('Ошибка при импорте Excel файла. Убедитесь, что файл .xlsx и содержит листы Program и Lessons.');
        }
        finally {
            if (fileInputRef.current)
                fileInputRef.current.value = '';
        }
    };
    const handleSubmitLesson = (e) => {
        e.preventDefault();
        if (editingLesson) {
            handleUpdateLesson();
        }
        else {
            handleSaveLesson();
        }
    };
    if (loading) {
        return _jsx("div", { className: "loading", children: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430..." });
    }
    return (_jsxs("div", { className: "course-program", children: [_jsxs("div", { className: "program-header", children: [_jsxs("div", { children: [_jsxs("h1", { className: "program-title", children: ["\uD83D\uDCCB \u041F\u0440\u043E\u0433\u0440\u0430\u043C\u043C\u0430 \u043A\u0443\u0440\u0441\u0430: ", subject?.name] }), _jsxs("div", { className: "program-info", children: [_jsxs("span", { className: "class-badge", children: ["\uD83C\uDFEB \u041A\u043B\u0430\u0441\u0441: ", classInfo?.name] }), program && (_jsxs(_Fragment, { children: [_jsxs("span", { className: "hours-badge", children: ["\u23F1\uFE0F \u0427\u0430\u0441\u043E\u0432: ", program.total_hours] }), _jsxs("span", { className: "description-badge", children: ["\uD83D\uDCDD ", program.description || 'Без описания'] })] }))] })] }), _jsxs("div", { className: "program-header-actions", children: [_jsxs("div", { className: "view-toggle", children: [_jsx("button", { className: `view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`, onClick: () => setViewMode('list'), title: "\u0421\u043F\u0438\u0441\u043E\u043A", children: "\u2630" }), _jsx("button", { className: `view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`, onClick: () => setViewMode('grid'), title: "\u0421\u0435\u0442\u043A\u0430", children: "\u229E" })] }), _jsxs("div", { className: "import-export", style: { display: 'flex', gap: 8, marginLeft: 8 }, children: [_jsx("button", { className: "btn-secondary", onClick: handleImportClick, children: "\u0418\u043C\u043F\u043E\u0440\u0442" }), _jsx("button", { className: "btn-secondary", onClick: handleExportProgram, children: "\u042D\u043A\u0441\u043F\u043E\u0440\u0442" }), _jsx("input", { ref: fileInputRef, type: "file", accept: ".xlsx, .xls, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", style: { display: 'none' }, onChange: handleImportFile })] }), program && (_jsx("button", { className: "btn-edit-program", onClick: () => setShowProgramModal(true), children: "\u270F\uFE0F \u0420\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u043F\u0440\u043E\u0433\u0440\u0430\u043C\u043C\u0443" }))] })] }), !program ? (_jsxs("div", { className: "no-program", children: [_jsx("div", { className: "no-program-icon", children: "\uD83D\uDCDA" }), _jsx("p", { children: "\u041F\u0440\u043E\u0433\u0440\u0430\u043C\u043C\u0430 \u043A\u0443\u0440\u0441\u0430 \u0435\u0449\u0435 \u043D\u0435 \u0441\u043E\u0437\u0434\u0430\u043D\u0430" }), _jsx("button", { className: "btn-primary", onClick: () => setShowProgramModal(true), children: "+ \u0421\u043E\u0437\u0434\u0430\u0442\u044C \u043F\u0440\u043E\u0433\u0440\u0430\u043C\u043C\u0443" })] })) : (_jsxs(_Fragment, { children: [_jsx("div", { className: "toolbar", children: _jsx("button", { className: "btn-primary", onClick: () => setShowLessonModal(true), children: "+ \u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0437\u0430\u043D\u044F\u0442\u0438\u0435" }) }), _jsx("div", { className: `lessons-container ${viewMode}`, children: lessons.length === 0 ? (_jsxs("div", { className: "empty-state", children: [_jsx("div", { className: "empty-icon", children: "\uD83D\uDCD6" }), _jsx("p", { children: "\u041D\u0435\u0442 \u0434\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u043D\u044B\u0445 \u0437\u0430\u043D\u044F\u0442\u0438\u0439" }), _jsx("button", { className: "btn-secondary", onClick: () => setShowLessonModal(true), children: "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u043F\u0435\u0440\u0432\u043E\u0435 \u0437\u0430\u043D\u044F\u0442\u0438\u0435" })] })) : (lessons.map((lesson) => (_jsxs("div", { className: `lesson-card ${viewMode}`, style: { borderTopColor: lessonTypeColors[lesson.lesson_type] }, children: [_jsxs("div", { className: "lesson-card-header", children: [_jsx("div", { className: "lesson-type", style: { background: lessonTypeColors[lesson.lesson_type] }, children: lessonTypeLabels[lesson.lesson_type] }), _jsxs("div", { className: "lesson-title", children: ["#", lesson.lesson_number, ". ", lesson.title] }), _jsxs("div", { className: "lesson-card-actions", children: [_jsx("button", { className: "icon-btn edit", onClick: () => {
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
                                                    }, children: "\u270F\uFE0F" }), _jsx("button", { className: "icon-btn delete", onClick: () => handleDeleteLesson(lesson.id), children: "\uD83D\uDDD1\uFE0F" })] })] }), _jsx("div", { className: "lesson-meta", children: _jsxs("span", { className: "meta-item", children: ["\u2B50 \u041C\u0430\u043A\u0441. \u0431\u0430\u043B\u043B: ", lesson.max_score] }) }), lesson.description && (_jsx("div", { className: "lesson-description", children: lesson.description })), lesson.requirements && (_jsxs("div", { className: "lesson-requirements", children: [_jsx("strong", { children: "\uD83D\uDCC4 \u0422\u0417:" }), " ", lesson.requirements] })), lesson.materials && lesson.materials.length > 0 && (_jsxs("div", { className: "lesson-materials", children: [_jsx("strong", { children: "\uD83D\uDCCE \u041C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u044B:" }), _jsx("div", { className: "materials-list", children: lesson.materials.map((m) => (_jsxs("div", { className: "material-item", children: [_jsx("span", { className: "material-chip", children: m.file_url ? (_jsx("a", { href: m.file_url, target: "_blank", rel: "noopener noreferrer", children: m.title })) : (m.title) }), _jsx("button", { className: "material-delete-btn", onClick: () => handleDeleteMaterial(m.id), title: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B", children: "\u2715" })] }, m.id))) })] })), _jsx("div", { className: "lesson-actions-bottom", children: _jsx("button", { className: "btn-small", onClick: () => {
                                            setSelectedLesson(lesson);
                                            setShowMaterialModal(true);
                                        }, children: "+ \u041C\u0430\u0442\u0435\u0440\u0438\u0430\u043B" }) })] }, lesson.id)))) })] })), showProgramModal && (_jsx("div", { className: "modal-overlay", onClick: () => setShowProgramModal(false), children: _jsxs("div", { className: "modal-content", onClick: (e) => e.stopPropagation(), children: [_jsx("h2", { children: program ? 'Редактировать программу' : 'Создать программу' }), _jsxs("form", { onSubmit: (e) => { e.preventDefault(); handleSaveProgram(); }, children: [_jsxs("div", { className: "form-group", children: [_jsx("label", { children: "\u041E\u0431\u0449\u0435\u0435 \u043A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E \u0447\u0430\u0441\u043E\u0432" }), _jsx("input", { type: "number", min: "0", value: programForm.total_hours, onChange: (e) => setProgramForm({ ...programForm, total_hours: parseInt(e.target.value) || 0 }), required: true })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "\u041E\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \u043F\u0440\u043E\u0433\u0440\u0430\u043C\u043C\u044B" }), _jsx("textarea", { value: programForm.description, onChange: (e) => setProgramForm({ ...programForm, description: e.target.value }), rows: 4, placeholder: "\u041A\u0440\u0430\u0442\u043A\u043E\u0435 \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \u043A\u0443\u0440\u0441\u0430, \u0446\u0435\u043B\u0438 \u0438 \u0437\u0430\u0434\u0430\u0447\u0438..." })] }), _jsxs("div", { className: "modal-buttons", children: [_jsx("button", { type: "button", onClick: () => setShowProgramModal(false), children: "\u041E\u0442\u043C\u0435\u043D\u0430" }), _jsx("button", { type: "submit", children: "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C" })] })] })] }) })), showLessonModal && (_jsx("div", { className: "modal-overlay", onClick: () => setShowLessonModal(false), children: _jsxs("div", { className: "modal-content modal-large", onClick: (e) => e.stopPropagation(), children: [_jsx("h2", { children: editingLesson ? '✏️ Редактировать занятие' : '➕ Добавить занятие' }), _jsxs("form", { onSubmit: handleSubmitLesson, children: [_jsxs("div", { className: "form-row", children: [_jsxs("div", { className: "form-group", children: [_jsx("label", { children: "\u041D\u043E\u043C\u0435\u0440 \u0437\u0430\u043D\u044F\u0442\u0438\u044F *" }), _jsx("input", { type: "number", value: lessonForm.lesson_number, onChange: (e) => setLessonForm({ ...lessonForm, lesson_number: parseInt(e.target.value) }), required: true })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "\u0422\u0438\u043F \u0437\u0430\u043D\u044F\u0442\u0438\u044F *" }), _jsxs("select", { value: lessonForm.lesson_type, onChange: (e) => setLessonForm({ ...lessonForm, lesson_type: e.target.value }), children: [_jsx("option", { value: "lecture", children: "\uD83D\uDCD6 \u041B\u0435\u043A\u0446\u0438\u044F" }), _jsx("option", { value: "lab", children: "\uD83D\uDD2C \u041B\u0430\u0431\u043E\u0440\u0430\u0442\u043E\u0440\u043D\u0430\u044F" }), _jsx("option", { value: "practice", children: "\u270F\uFE0F \u041F\u0440\u0430\u043A\u0442\u0438\u043A\u0430" }), _jsx("option", { value: "control", children: "\uD83D\uDCDD \u041A\u043E\u043D\u0442\u0440\u043E\u043B\u044C\u043D\u0430\u044F" }), _jsx("option", { value: "exam", children: "\uD83C\uDF93 \u042D\u043A\u0437\u0430\u043C\u0435\u043D" })] })] })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u0437\u0430\u043D\u044F\u0442\u0438\u044F *" }), _jsx("input", { type: "text", value: lessonForm.title, onChange: (e) => setLessonForm({ ...lessonForm, title: e.target.value }), required: true, placeholder: "\u041D\u0430\u043F\u0440\u0438\u043C\u0435\u0440: \u0412\u0432\u0435\u0434\u0435\u043D\u0438\u0435 \u0432 \u043F\u0440\u043E\u0433\u0440\u0430\u043C\u043C\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435" })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "\u041E\u043F\u0438\u0441\u0430\u043D\u0438\u0435" }), _jsx("textarea", { value: lessonForm.description, onChange: (e) => setLessonForm({ ...lessonForm, description: e.target.value }), rows: 2, placeholder: "\u041A\u0440\u0430\u0442\u043A\u043E\u0435 \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \u0441\u043E\u0434\u0435\u0440\u0436\u0430\u043D\u0438\u044F \u0437\u0430\u043D\u044F\u0442\u0438\u044F" })] }), _jsx("div", { className: "form-row", children: _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "\u2B50 \u041C\u0430\u043A\u0441\u0438\u043C\u0430\u043B\u044C\u043D\u044B\u0439 \u0431\u0430\u043B\u043B" }), _jsx("input", { type: "number", min: "1", max: "100", value: lessonForm.max_score, onChange: (e) => setLessonForm({ ...lessonForm, max_score: parseInt(e.target.value) }) })] }) }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "\uD83D\uDCC4 \u0422\u0417 / \u0417\u0430\u0434\u0430\u043D\u0438\u0435" }), _jsx("textarea", { value: lessonForm.requirements, onChange: (e) => setLessonForm({ ...lessonForm, requirements: e.target.value }), rows: 3, placeholder: "\u0421\u0441\u044B\u043B\u043A\u0430 \u043D\u0430 \u0422\u0417 \u0438\u043B\u0438 \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \u0437\u0430\u0434\u0430\u043D\u0438\u044F..." })] }), _jsxs("div", { className: "modal-buttons", children: [_jsx("button", { type: "button", onClick: () => setShowLessonModal(false), children: "\u041E\u0442\u043C\u0435\u043D\u0430" }), _jsx("button", { type: "submit", children: editingLesson ? 'Обновить' : 'Создать' })] })] })] }) })), showMaterialModal && (_jsx("div", { className: "modal-overlay", onClick: () => setShowMaterialModal(false), children: _jsxs("div", { className: "modal-content", onClick: (e) => e.stopPropagation(), children: [_jsx("h2", { children: "\uD83D\uDCCE \u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B" }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u0430 *" }), _jsx("input", { type: "text", value: materialForm.title, onChange: (e) => setMaterialForm({ ...materialForm, title: e.target.value }), required: true, placeholder: "\u041D\u0430\u043F\u0440\u0438\u043C\u0435\u0440: \u041F\u0440\u0435\u0437\u0435\u043D\u0442\u0430\u0446\u0438\u044F \u043A \u043B\u0435\u043A\u0446\u0438\u0438 1" })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "\u0421\u0441\u044B\u043B\u043A\u0430 \u043D\u0430 \u0444\u0430\u0439\u043B (URL)" }), _jsx("input", { type: "url", value: materialForm.file_url, onChange: (e) => setMaterialForm({ ...materialForm, file_url: e.target.value }), placeholder: "https://drive.google.com/..." })] }), _jsxs("div", { className: "modal-buttons", children: [_jsx("button", { type: "button", onClick: () => setShowMaterialModal(false), children: "\u041E\u0442\u043C\u0435\u043D\u0430" }), _jsx("button", { onClick: () => handleAddMaterial(selectedLesson.id), children: "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C" })] })] }) })), _jsx("style", { children: `
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
        
        .lessons-container {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        
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
        
        .lesson-card.grid {
          padding: 16px;
        }

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
      ` })] }));
}
export default CourseProgramPage;
