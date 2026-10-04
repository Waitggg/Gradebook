import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
const daysLeft = (d) => Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
const isOverdue = (d) => new Date(d) < new Date();
const fmt = (d) => new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
const StatusBadge = ({ submitted, deadline }) => {
    if (submitted)
        return _jsx("span", { style: { fontSize: 11, color: '#059669', background: '#ecfdf5', padding: '2px 8px', borderRadius: 999, fontWeight: 500 }, children: "\u0421\u0434\u0430\u043D\u043E" });
    if (isOverdue(deadline))
        return _jsx("span", { style: { fontSize: 11, color: '#ef4444', background: '#fef2f2', padding: '2px 8px', borderRadius: 999, fontWeight: 500 }, children: "\u041F\u0440\u043E\u0441\u0440\u043E\u0447\u0435\u043D\u043E" });
    const d = daysLeft(deadline);
    return _jsx("span", { style: { fontSize: 11, color: '#3b82f6', background: '#eff6ff', padding: '2px 8px', borderRadius: 999, fontWeight: 500 }, children: d === 0 ? 'Сегодня' : `${d} дн.` });
};
const LabCard = ({ lab, index, active, onClick }) => (_jsxs("div", { onClick: onClick, style: {
        cursor: 'pointer', padding: '12px 16px', borderRadius: 12, marginBottom: 4,
        border: active ? '1px solid #d1d5db' : '1px solid transparent',
        background: active ? '#f9fafb' : 'transparent',
        transition: 'all 0.15s'
    }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }, children: [_jsxs("span", { style: { fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }, children: ["\u0420\u0430\u0431\u043E\u0442\u0430 \u2116", index + 1] }), _jsx(StatusBadge, { submitted: lab.submitted, deadline: lab.deadline })] }), _jsx("div", { style: { fontSize: 14, fontWeight: 600, color: '#1f2937', lineHeight: 1.3, marginBottom: 6 }, children: lab.title }), _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx("span", { style: { fontSize: 11, color: '#9ca3af' }, children: lab.subject_name }), _jsxs("div", { style: { display: 'flex', gap: 8, alignItems: 'center' }, children: [_jsx("span", { style: { fontSize: 11, color: isOverdue(lab.deadline) && !lab.submitted ? '#ef4444' : '#9ca3af' }, children: fmt(lab.deadline) }), lab.grade && _jsxs("span", { style: { fontSize: 11, fontWeight: 700, color: '#d97706' }, children: [lab.grade, "/10"] })] })] })] }));
const Sec = ({ title, children }) => (_jsxs("div", { style: { marginBottom: 24 }, children: [_jsx("div", { style: { fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }, children: title }), children] }));
const Chip = ({ active, onClick, children }) => (_jsx("button", { onClick: onClick, style: {
        padding: '4px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer',
        background: active ? '#111827' : '#f3f4f6', color: active ? '#fff' : '#6b7280'
    }, children: children }));
const LabStudentPage = () => {
    const [labs, setLabs] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [filterSubject, setFilterSubject] = useState(null);
    const [filterStatus, setFilterStatus] = useState('all');
    const [activeId, setActiveId] = useState(null);
    const [detail, setDetail] = useState(null);
    const [submission, setSubmission] = useState(null);
    const [grade, setGrade] = useState(null);
    const [mates, setMates] = useState([]);
    const [comment, setComment] = useState('');
    const [file, setFile] = useState(null);
    const [sending, setSending] = useState(false);
    const [loading, setLoading] = useState(false);
    const [loadingD, setLoadingD] = useState(false);
    const fileInputRef = useRef(null);
    const fetchLabs = async () => {
        setLoading(true);
        try {
            const params = {};
            if (filterSubject)
                params.subject_id = filterSubject;
            const { data } = await axios.get('/api/labs', { params });
            let filtered = data.labs || [];
            if (filterStatus === 'submitted')
                filtered = filtered.filter((l) => l.submitted);
            if (filterStatus === 'pending')
                filtered = filtered.filter((l) => !l.submitted);
            setLabs(filtered);
        }
        catch { }
        setLoading(false);
    };
    const openLab = async (id) => {
        setActiveId(id);
        setLoadingD(true);
        try {
            const { data } = await axios.get(`/api/labs/${id}`);
            setDetail(data.lab);
            setSubmission(data.submission);
            setGrade(data.grade);
            setMates(data.groupmates || []);
            setComment('');
            setFile(null);
        }
        catch { }
        setLoadingD(false);
    };
    const send = async () => {
        if (!detail || (!comment && !file))
            return;
        setSending(true);
        try {
            const fd = new FormData();
            fd.append('submission_text', comment);
            if (file)
                fd.append('file', file);
            await axios.post(`/api/labs/${detail.id}/submit`, fd);
            openLab(detail.id);
        }
        catch { }
        setSending(false);
    };
    const downloadFile = async (filePath) => {
        try {
            const response = await axios.get(filePath, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filePath.split('/').pop() || 'file');
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        }
        catch { }
    };
    useEffect(() => { fetchLabs(); }, [filterSubject, filterStatus]);
    useEffect(() => {
        axios.get('/api/labs/subjects').then(r => setSubjects(r.data.subjects || [])).catch(() => { });
    }, []);
    const activeLab = labs.find(l => l.id === activeId);
    const colors = { bg: '#f8f9fa', white: '#fff', border: '#e5e7eb', text: '#1f2937', sub: '#9ca3af', accent: '#111827' };
    return (_jsxs("div", { style: { display: 'flex', height: '100vh', background: colors.bg, fontFamily: 'system-ui, sans-serif', color: colors.text }, children: [_jsxs("div", { style: { width: 300, background: colors.white, borderRight: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column', flexShrink: 0 }, children: [_jsxs("div", { style: { padding: '20px 20px 16px', borderBottom: `1px solid ${colors.border}` }, children: [_jsx("div", { style: { fontSize: 18, fontWeight: 700, marginBottom: 12 }, children: "\u041B\u0430\u0431\u043E\u0440\u0430\u0442\u043E\u0440\u043D\u044B\u0435 \u0440\u0430\u0431\u043E\u0442\u044B" }), _jsx("div", { style: { fontSize: 10, fontWeight: 600, color: colors.sub, textTransform: 'uppercase', marginBottom: 6 }, children: "\u041F\u0440\u0435\u0434\u043C\u0435\u0442" }), _jsxs("div", { style: { display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 12 }, children: [_jsx(Chip, { active: !filterSubject, onClick: () => setFilterSubject(null), children: "\u0412\u0441\u0435" }), subjects.map(s => (_jsx(Chip, { active: filterSubject === s.id, onClick: () => setFilterSubject(s.id), children: s.name }, s.id)))] }), _jsx("div", { style: { fontSize: 10, fontWeight: 600, color: colors.sub, textTransform: 'uppercase', marginBottom: 6 }, children: "\u0421\u0442\u0430\u0442\u0443\u0441" }), _jsxs("div", { style: { display: 'flex', gap: 4 }, children: [_jsx(Chip, { active: filterStatus === 'all', onClick: () => setFilterStatus('all'), children: "\u0412\u0441\u0435" }), _jsx(Chip, { active: filterStatus === 'submitted', onClick: () => setFilterStatus('submitted'), children: "\u0421\u0434\u0430\u043D\u043E" }), _jsx(Chip, { active: filterStatus === 'pending', onClick: () => setFilterStatus('pending'), children: "\u041D\u0435 \u0441\u0434\u0430\u043D\u043E" })] })] }), _jsx("div", { style: { flex: 1, overflow: 'auto', padding: '8px 12px' }, children: loading ? _jsx("div", { style: { textAlign: 'center', color: colors.sub, fontSize: 13, padding: 40 }, children: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430..." })
                            : labs.length === 0 ? _jsx("div", { style: { textAlign: 'center', color: colors.sub, fontSize: 13, padding: 40 }, children: "\u041D\u0435\u0442 \u0440\u0430\u0431\u043E\u0442" })
                                : labs.map((lab, i) => (_jsx(LabCard, { lab: lab, index: i, active: activeId === lab.id, onClick: () => openLab(lab.id) }, lab.id))) }), _jsxs("div", { style: { padding: '10px 20px', borderTop: `1px solid ${colors.border}`, fontSize: 11, color: colors.sub }, children: ["\u0412\u0441\u0435\u0433\u043E: ", labs.length, " \u00B7 \u0421\u0434\u0430\u043D\u043E: ", labs.filter(l => l.submitted).length] })] }), _jsx("div", { style: { flex: 1, overflow: 'auto', padding: 40 }, children: !activeLab ? (_jsx("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: colors.sub, fontSize: 14 }, children: "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043B\u0430\u0431\u043E\u0440\u0430\u0442\u043E\u0440\u043D\u0443\u044E \u0440\u0430\u0431\u043E\u0442\u0443 \u0432 \u0431\u043E\u043A\u043E\u0432\u043E\u0439 \u043F\u0430\u043D\u0435\u043B\u0438" })) : loadingD ? (_jsx("div", { style: { maxWidth: 640, margin: '0 auto', color: colors.sub, fontSize: 14 }, children: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430..." })) : detail && (_jsxs("div", { style: { maxWidth: 640, margin: '0 auto' }, children: [_jsxs("div", { style: { marginBottom: 28 }, children: [_jsxs("div", { style: { display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }, children: [_jsx("span", { style: { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, color: colors.sub, background: '#f3f4f6', padding: '3px 10px', borderRadius: 6 }, children: "\u041B\u0430\u0431\u043E\u0440\u0430\u0442\u043E\u0440\u043D\u0430\u044F \u0440\u0430\u0431\u043E\u0442\u0430" }), detail.is_group && _jsx("span", { style: { fontSize: 10, fontWeight: 700, background: '#ede9fe', color: '#7c3aed', padding: '3px 10px', borderRadius: 6 }, children: "\u041A\u043E\u043C\u0430\u043D\u0434\u043D\u0430\u044F" }), _jsx(StatusBadge, { submitted: !!submission, deadline: detail.deadline })] }), _jsx("h1", { style: { fontSize: 24, fontWeight: 700, margin: '0 0 4px', lineHeight: 1.2 }, children: detail.title }), _jsxs("p", { style: { fontSize: 13, color: colors.sub, margin: 0 }, children: [detail.subject_name, " \u00B7 ", detail.teacher_name] })] }), _jsxs("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 }, children: [_jsxs("div", { style: { background: '#f9fafb', borderRadius: 12, padding: 16 }, children: [_jsx("div", { style: { fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, color: colors.sub, marginBottom: 4 }, children: "\u0412\u044B\u0434\u0430\u043D\u043E" }), _jsx("div", { style: { fontSize: 15, fontWeight: 600 }, children: fmt(detail.issued_date) })] }), _jsxs("div", { style: { background: isOverdue(detail.deadline) && !submission ? '#fef2f2' : '#f9fafb', borderRadius: 12, padding: 16 }, children: [_jsx("div", { style: { fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, color: isOverdue(detail.deadline) && !submission ? '#ef4444' : colors.sub, marginBottom: 4 }, children: "\u0414\u0435\u0434\u043B\u0430\u0439\u043D" }), _jsx("div", { style: { fontSize: 15, fontWeight: 600, color: isOverdue(detail.deadline) && !submission ? '#ef4444' : colors.text }, children: fmt(detail.deadline) })] })] }), detail.description && _jsx(Sec, { title: "\u041E\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \u0437\u0430\u0434\u0430\u043D\u0438\u044F", children: _jsx("p", { style: { margin: 0, fontSize: 14, lineHeight: 1.6, color: '#4b5563' }, children: detail.description }) }), detail.materials?.length > 0 && (_jsx(Sec, { title: "\u0422\u0435\u043E\u0440\u0435\u0442\u0438\u0447\u0435\u0441\u043A\u0438\u0435 \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u044B", children: detail.materials.map((m, i) => (_jsx("a", { href: m.material_url, target: "_blank", rel: "noopener noreferrer", style: {
                                    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                                    background: colors.white, borderRadius: 10, border: `1px solid ${colors.border}`,
                                    marginBottom: 8, textDecoration: 'none', color: colors.text, fontSize: 13
                                }, children: _jsx("span", { style: { color: '#3b82f6', fontWeight: 500 }, children: m.title || m.material_url }) }, i))) })), detail.is_group && mates.length > 0 && (_jsx(Sec, { title: "\u0421\u043E\u0441\u0442\u0430\u0432 \u043A\u043E\u043C\u0430\u043D\u0434\u044B", children: _jsx("div", { style: { display: 'flex', gap: 10, flexWrap: 'wrap' }, children: mates.map(m => (_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8, background: '#ede9fe', borderRadius: 999, padding: '6px 14px', fontSize: 13 }, children: [_jsx("div", { style: { width: 24, height: 24, borderRadius: '50%', background: '#c4b5fd', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11, color: '#5b21b6' }, children: m.name[0] }), m.name] }, m.id))) }) })), _jsxs(Sec, { title: submission ? 'Обновить комментарий' : 'Оставить комментарий', children: [_jsx("textarea", { value: comment, onChange: e => setComment(e.target.value), rows: 4, style: { width: '100%', border: `1px solid ${colors.border}`, borderRadius: 10, padding: 12, fontSize: 13, resize: 'vertical', marginBottom: 12, boxSizing: 'border-box' }, placeholder: "\u041A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0439 \u043A \u0440\u0435\u0448\u0435\u043D\u0438\u044E..." }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 10 }, children: [_jsx("button", { onClick: () => fileInputRef.current?.click(), style: {
                                                        cursor: 'pointer', fontSize: 13, color: '#6b7280', background: '#f3f4f6',
                                                        padding: '6px 14px', borderRadius: 8, border: 'none'
                                                    }, children: file ? file.name : 'Прикрепить файл' }), _jsx("input", { ref: fileInputRef, type: "file", style: { display: 'none' }, onChange: e => setFile(e.target.files?.[0] || null) }), file && _jsx("button", { onClick: () => setFile(null), style: { border: 'none', background: 'none', color: '#ef4444', fontSize: 12, cursor: 'pointer' }, children: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C" })] }), _jsx("button", { onClick: send, disabled: sending || (!comment && !file), style: {
                                                padding: '8px 20px', background: colors.accent, color: '#fff', border: 'none', borderRadius: 8,
                                                fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: sending ? 0.5 : 1
                                            }, children: sending ? 'Отправка...' : submission ? 'Обновить' : 'Отправить' })] })] }), submission && (_jsx(Sec, { title: "\u041E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u043D\u043E\u0435 \u0440\u0435\u0448\u0435\u043D\u0438\u0435", children: _jsxs("div", { style: { background: '#ecfdf5', borderRadius: 12, padding: 16, border: '1px solid #a7f3d0' }, children: [_jsxs("div", { style: { fontSize: 12, color: '#059669', marginBottom: 8 }, children: ["\u041E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u043E ", new Date(submission.submitted_at).toLocaleString('ru-RU')] }), submission.submission_text && _jsx("div", { style: { background: '#fff', borderRadius: 8, padding: 12, fontSize: 13, color: '#374151', marginBottom: 8 }, children: submission.submission_text }), submission.file_path && (_jsx("button", { onClick: () => downloadFile(submission.file_path), style: {
                                            background: 'none', border: 'none', color: '#3b82f6', fontSize: 13, cursor: 'pointer',
                                            textDecoration: 'underline', padding: 0
                                        }, children: "\u0421\u043A\u0430\u0447\u0430\u0442\u044C \u043F\u0440\u0438\u043A\u0440\u0435\u043F\u043B\u0451\u043D\u043D\u044B\u0439 \u0444\u0430\u0439\u043B" }))] }) })), grade && (_jsx(Sec, { title: "\u041E\u0446\u0435\u043D\u043A\u0430 \u043F\u0440\u0435\u043F\u043E\u0434\u0430\u0432\u0430\u0442\u0435\u043B\u044F", children: _jsxs("div", { style: { background: '#fffbeb', borderRadius: 12, padding: 16, border: '1px solid #fde68a' }, children: [_jsxs("div", { style: { fontSize: 36, fontWeight: 700, color: '#d97706' }, children: [grade.grade, _jsx("span", { style: { fontSize: 16, color: '#92400e' }, children: "/10" })] }), grade.comment && _jsx("div", { style: { background: '#fff', borderRadius: 8, padding: 12, marginTop: 10, fontSize: 13, color: '#374151' }, children: grade.comment }), _jsx("div", { style: { fontSize: 11, color: '#9ca3af', marginTop: 8 }, children: fmt(grade.graded_at) })] }) }))] })) })] }));
};
export default LabStudentPage;
