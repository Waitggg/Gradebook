import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
function GradeNotification() {
    const { notifications, unreadCount, markAsRead, clearNotifications } = useWebSocket();
    const [isOpen, setIsOpen] = useState(false);
    useEffect(() => {
        if (Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, []);
    const getGradeTypeText = (type) => {
        switch (type) {
            case 'exam': return 'Экзамен';
            case 'test': return 'Контрольная работа';
            case 'homework': return 'Домашняя работа';
            default: return 'Классная работа';
        }
    };
    const getGradeColor = (grade) => {
        if (grade >= 9)
            return '#10b981';
        if (grade >= 7)
            return '#3b82f6';
        if (grade >= 4)
            return '#f59e0b';
        return '#ef4444';
    };
    return (_jsxs("div", { style: { position: 'relative' }, children: [_jsxs("button", { onClick: () => {
                    setIsOpen(!isOpen);
                    if (isOpen)
                        markAsRead();
                }, style: {
                    background: 'none',
                    border: 'none',
                    fontSize: '24px',
                    cursor: 'pointer',
                    position: 'relative',
                    padding: '8px'
                }, children: ["\uD83D\uDD14", unreadCount > 0 && (_jsx("span", { style: {
                            position: 'absolute',
                            top: '0',
                            right: '0',
                            background: '#ef4444',
                            color: 'white',
                            borderRadius: '50%',
                            width: '18px',
                            height: '18px',
                            fontSize: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }, children: unreadCount }))] }), isOpen && (_jsxs("div", { style: {
                    position: 'absolute',
                    top: '50px',
                    right: '0',
                    width: '350px',
                    maxHeight: '400px',
                    background: 'white',
                    borderRadius: '12px',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                    zIndex: 1000,
                    overflow: 'hidden'
                }, children: [_jsxs("div", { style: {
                            padding: '12px 16px',
                            borderBottom: '1px solid #e5e7eb',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }, children: [_jsx("h3", { style: { margin: 0, fontSize: '16px', fontWeight: '600' }, children: "\u0423\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u044F" }), notifications.length > 0 && (_jsx("button", { onClick: clearNotifications, style: {
                                    background: 'none',
                                    border: 'none',
                                    color: '#6b7280',
                                    cursor: 'pointer',
                                    fontSize: '12px'
                                }, children: "\u041E\u0447\u0438\u0441\u0442\u0438\u0442\u044C" }))] }), _jsx("div", { style: { maxHeight: '350px', overflowY: 'auto' }, children: notifications.length === 0 ? (_jsx("div", { style: { padding: '40px', textAlign: 'center', color: '#9ca3af' }, children: "\u041D\u0435\u0442 \u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u0439" })) : (notifications.map((notif, idx) => (_jsxs("div", { style: {
                                padding: '12px 16px',
                                borderBottom: '1px solid #f3f4f6',
                                transition: 'background 0.2s'
                            }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '12px' }, children: [_jsx("div", { style: {
                                                width: '40px',
                                                height: '40px',
                                                borderRadius: '50%',
                                                background: getGradeColor(notif.grade),
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: 'white',
                                                fontWeight: 'bold',
                                                fontSize: '18px'
                                            }, children: notif.grade }), _jsxs("div", { style: { flex: 1 }, children: [_jsx("div", { style: { fontWeight: '600', fontSize: '14px' }, children: notif.subject_name }), _jsxs("div", { style: { fontSize: '12px', color: '#6b7280' }, children: [getGradeTypeText(notif.grade_type), " \u2022 ", notif.teacher_name] }), _jsx("div", { style: { fontSize: '11px', color: '#9ca3af' }, children: new Date(notif.date).toLocaleDateString() })] })] }), notif.comment && (_jsxs("div", { style: {
                                        marginTop: '8px',
                                        padding: '6px 8px',
                                        background: '#f3f4f6',
                                        borderRadius: '6px',
                                        fontSize: '12px',
                                        color: '#4b5563'
                                    }, children: ["\uD83D\uDCAC ", notif.comment] }))] }, idx)))) })] }))] }));
}
export default GradeNotification;
