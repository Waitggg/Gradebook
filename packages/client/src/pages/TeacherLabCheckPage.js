import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState } from 'react';
import axios from 'axios';
const TeacherLabCheckPage = () => {
    const [labs, setLabs] = useState([]);
    const [selectedLab, setSelectedLab] = useState(null);
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [grading, setGrading] = useState(null);
    const [confirmAll, setConfirmAll] = useState(false);
    const fetchLabs = async () => {
        setLoading(true);
        const { data } = await axios.get('/api/labs/teacher');
        setLabs(data.labs || []);
        setLoading(false);
    };
    const openLab = async (lab) => {
        setSelectedLab(lab);
        setLoading(true);
        const { data } = await axios.get(`/api/labs/teacher/${lab.id}/submissions`);
        setSubmissions(data.submissions || []);
        setLoading(false);
    };
    const submitGrade = async (submissionIds) => {
        if (!grading || grading.grade < 1 || grading.grade > 10)
            return;
        for (const id of submissionIds) {
            await axios.post(`/api/labs/submission/${id}/grade`, { grade: grading.grade, comment: grading.comment });
        }
        setGrading(null);
        setConfirmAll(false);
        if (selectedLab)
            openLab(selectedLab);
    };
    useEffect(() => { fetchLabs(); }, []);
    const downloadFile = async (path) => {
        const res = await axios.get(path, { responseType: 'blob' });
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const a = document.createElement('a');
        a.href = url;
        a.download = path.split('/').pop() || 'file';
        a.click();
    };
    const groupedSubmissions = () => {
        if (!selectedLab?.is_group)
            return { individual: submissions };
        const groups = {};
        submissions.forEach(s => {
            const key = s.team_name || 'Без команды';
            if (!groups[key])
                groups[key] = [];
            groups[key].push(s);
        });
        return groups;
    };
    const grouped = groupedSubmissions();
    return (_jsxs("div", { style: { display: 'flex', height: '100vh', background: '#f5f5f7', fontFamily: 'system-ui, sans-serif' }, children: [_jsxs("div", { style: { width: 300, background: '#fff', borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', boxShadow: '2px 0 8px rgba(0,0,0,0.04)' }, children: [_jsxs("div", { style: { padding: '24px 20px 16px', borderBottom: '1px solid #f0f0f0' }, children: [_jsx("h2", { style: { fontSize: 17, fontWeight: 700, margin: 0, color: '#1a1a2e' }, children: "\u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u0440\u0430\u0431\u043E\u0442" }), _jsxs("p", { style: { fontSize: 12, color: '#9ca3af', margin: '4px 0 0' }, children: [labs.length, " \u043B\u0430\u0431\u043E\u0440\u0430\u0442\u043E\u0440\u043D\u044B\u0445"] })] }), _jsx("div", { style: { flex: 1, overflow: 'auto', padding: '8px 12px' }, children: loading && !selectedLab ? _jsx("p", { style: { color: '#9ca3af', textAlign: 'center', fontSize: 13, padding: 20 }, children: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430..." })
                            : labs.map(lab => (_jsxs("div", { onClick: () => openLab(lab), style: {
                                    padding: '14px 16px', borderRadius: 12, marginBottom: 4, cursor: 'pointer',
                                    background: selectedLab?.id === lab.id ? '#f0f7ff' : 'transparent',
                                    border: selectedLab?.id === lab.id ? '1px solid #dbeafe' : '1px solid transparent',
                                    transition: 'all 0.15s'
                                }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }, children: [_jsx("p", { style: { fontSize: 13, fontWeight: 600, margin: 0, color: '#1f2937', lineHeight: 1.3 }, children: lab.title }), _jsxs("span", { style: { fontSize: 11, background: '#f3f4f6', padding: '2px 8px', borderRadius: 999, color: '#6b7280', fontWeight: 500, whiteSpace: 'nowrap', marginLeft: 8 }, children: [lab.submissions_count, " \u0441\u0434\u0430\u0447"] })] }), _jsxs("p", { style: { fontSize: 11, color: '#9ca3af', margin: '4px 0 0' }, children: [lab.subject_name, lab.is_group ? ' · Командная' : ''] })] }, lab.id))) })] }), _jsx("div", { style: { flex: 1, overflow: 'auto', padding: '40px 48px' }, children: !selectedLab ? (_jsx("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }, children: _jsxs("div", { style: { textAlign: 'center', color: '#d1d5db' }, children: [_jsx("p", { style: { fontSize: 48, margin: '0 0 12px' }, children: "\uD83D\uDCCB" }), _jsx("p", { style: { fontSize: 15, fontWeight: 500 }, children: "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043B\u0430\u0431\u043E\u0440\u0430\u0442\u043E\u0440\u043D\u0443\u044E \u0440\u0430\u0431\u043E\u0442\u0443" })] }) })) : loading ? _jsx("p", { style: { color: '#9ca3af', textAlign: 'center', padding: 40 }, children: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430..." })
                    : submissions.length === 0 ? (_jsxs("div", { style: { textAlign: 'center', padding: 60, color: '#d1d5db' }, children: [_jsx("p", { style: { fontSize: 36, margin: 0 }, children: "\uD83D\uDCED" }), _jsx("p", { style: { fontSize: 15, fontWeight: 500, marginTop: 12 }, children: "\u041D\u0435\u0442 \u0441\u0434\u0430\u0432\u0448\u0438\u0445 \u0441\u0442\u0443\u0434\u0435\u043D\u0442\u043E\u0432" })] })) : (_jsxs("div", { style: { maxWidth: 750 }, children: [_jsxs("div", { style: { marginBottom: 28 }, children: [_jsx("div", { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }, children: _jsx("span", { style: { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, color: '#9ca3af', background: '#f3f4f6', padding: '3px 10px', borderRadius: 6 }, children: selectedLab.is_group ? 'Командная работа' : 'Индивидуальная' }) }), _jsx("h1", { style: { fontSize: 24, fontWeight: 700, margin: 0, color: '#1a1a2e', lineHeight: 1.2 }, children: selectedLab.title }), _jsxs("p", { style: { fontSize: 13, color: '#9ca3af', margin: '6px 0 0' }, children: [selectedLab.subject_name, " \u00B7 \u0421\u0434\u0430\u0447: ", selectedLab.submissions_count] })] }), Object.entries(grouped).map(([groupName, groupSubs]) => (_jsxs("div", { style: { marginBottom: 28 }, children: [selectedLab.is_group && (_jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }, children: [_jsxs("h3", { style: { fontSize: 14, fontWeight: 600, color: '#374151', margin: 0 }, children: [groupName, _jsxs("span", { style: { fontWeight: 400, color: '#9ca3af', marginLeft: 6 }, children: ["(", groupSubs.length, ")"] })] }), groupSubs.length > 1 && (_jsx("button", { onClick: () => setGrading({ ids: groupSubs.map(s => s.id), grade: 5, comment: '' }), style: { fontSize: 11, background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', color: '#0369a1' }, children: "\u0412\u044B\u0441\u0442\u0430\u0432\u0438\u0442\u044C \u0432\u0441\u0435\u043C" }))] })), groupSubs.map(sub => (_jsxs("div", { style: {
                                            background: '#fff', borderRadius: 14, padding: '20px 24px', marginBottom: 10,
                                            border: '1px solid #f0f0f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                                        }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }, children: [_jsxs("div", { children: [_jsx("p", { style: { fontWeight: 600, margin: 0, fontSize: 14, color: '#1f2937' }, children: sub.student_name }), _jsx("p", { style: { fontSize: 11, color: '#9ca3af', margin: '2px 0 0' }, children: sub.submitted_at })] }), sub.grade ? (_jsxs("div", { style: { textAlign: 'right' }, children: [_jsx("span", { style: { fontSize: 28, fontWeight: 700, color: '#d97706' }, children: sub.grade }), _jsx("span", { style: { fontSize: 13, color: '#b45309' }, children: "/10" })] })) : (_jsx("span", { style: { fontSize: 11, background: '#fef3c7', color: '#b45309', padding: '3px 10px', borderRadius: 999, fontWeight: 500 }, children: "\u041D\u0435 \u043E\u0446\u0435\u043D\u0435\u043D\u043E" }))] }), sub.submission_text && (_jsx("div", { style: { background: '#f9fafb', borderRadius: 8, padding: '12px 16px', marginBottom: 10, fontSize: 13, color: '#4b5563', lineHeight: 1.5 }, children: sub.submission_text })), sub.file_path && (_jsx("button", { onClick: () => downloadFile(sub.file_path), style: {
                                                    fontSize: 12, color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer',
                                                    padding: 0, fontWeight: 500, marginBottom: 10
                                                }, children: "\uD83D\uDCCE \u0421\u043A\u0430\u0447\u0430\u0442\u044C \u043F\u0440\u0438\u043A\u0440\u0435\u043F\u043B\u0451\u043D\u043D\u044B\u0439 \u0444\u0430\u0439\u043B" })), sub.grade_comment && (_jsxs("div", { style: { background: '#fffbeb', borderRadius: 8, padding: '10px 14px', marginBottom: 10, fontSize: 12, color: '#92400e' }, children: ["\uD83D\uDCAC ", sub.grade_comment] })), grading?.ids.includes(sub.id) ? (_jsxs("div", { style: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }, children: [_jsx("input", { type: "number", min: 1, max: 10, value: grading.grade, onChange: e => setGrading({ ...grading, grade: +e.target.value }), style: { width: 56, padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, textAlign: 'center' } }), _jsx("input", { placeholder: "\u041A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0439", value: grading.comment, onChange: e => setGrading({ ...grading, comment: e.target.value }), style: { flex: 1, minWidth: 140, padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13 } }), _jsx("button", { onClick: () => {
                                                            if (grading.ids.length > 1 && !confirmAll) {
                                                                setConfirmAll(true);
                                                                return;
                                                            }
                                                            submitGrade(grading.ids);
                                                        }, style: { background: '#111827', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }, children: confirmAll ? 'Подтвердить всем' : 'OK' }), _jsx("button", { onClick: () => { setGrading(null); setConfirmAll(false); }, style: { background: '#f3f4f6', border: 'none', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontSize: 12 }, children: "\u041E\u0442\u043C\u0435\u043D\u0430" })] })) : (_jsx("button", { onClick: () => setGrading({ ids: [sub.id], grade: sub.grade || 5, comment: sub.grade_comment || '' }), style: { background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '7px 16px', cursor: 'pointer', fontSize: 12, color: '#374151', fontWeight: 500 }, children: sub.grade ? 'Изменить оценку' : 'Выставить оценку' }))] }, sub.id)))] }, groupName)))] })) }), confirmAll && grading && (_jsx("div", { style: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }, children: _jsxs("div", { style: { background: '#fff', borderRadius: 16, padding: 28, maxWidth: 400, width: '90%', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }, children: [_jsx("p", { style: { fontSize: 15, fontWeight: 600, margin: '0 0 8px' }, children: "\u0412\u044B\u0441\u0442\u0430\u0432\u0438\u0442\u044C \u043E\u0446\u0435\u043D\u043A\u0443 \u0432\u0441\u0435\u043C?" }), _jsxs("p", { style: { fontSize: 13, color: '#6b7280', margin: '0 0 20px' }, children: ["\u041E\u0446\u0435\u043D\u043A\u0430 ", _jsxs("b", { children: [grading.grade, "/10"] }), " \u0431\u0443\u0434\u0435\u0442 \u043F\u0440\u043E\u0441\u0442\u0430\u0432\u043B\u0435\u043D\u0430 ", grading.ids.length, " \u0441\u0442\u0443\u0434\u0435\u043D\u0442\u0430\u043C \u0432 \u044D\u0442\u043E\u0439 \u043A\u043E\u043C\u0430\u043D\u0434\u0435."] }), _jsxs("div", { style: { display: 'flex', gap: 10, justifyContent: 'center' }, children: [_jsx("button", { onClick: () => { setConfirmAll(false); setGrading(null); }, style: { background: '#f3f4f6', border: 'none', borderRadius: 8, padding: '10px 24px', cursor: 'pointer', fontSize: 13 }, children: "\u041E\u0442\u043C\u0435\u043D\u0430" }), _jsx("button", { onClick: () => submitGrade(grading.ids), style: { background: '#111827', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }, children: "\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u044C" })] })] }) }))] }));
};
export default TeacherLabCheckPage;
