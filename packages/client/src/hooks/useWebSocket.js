import { useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';
export function useWebSocket() {
    const [socket, setSocket] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    useEffect(() => {
        const newSocket = io('http://localhost:3000', {
            withCredentials: true
        });
        setSocket(newSocket);
        newSocket.on('new_grade', (data) => {
            setNotifications(prev => [data, ...prev]);
            setUnreadCount(prev => prev + 1);
            if (Notification.permission === 'granted') {
                new Notification('Новая оценка!', {
                    body: `${data.subject_name}: ${data.grade}`,
                    icon: '/vite.svg'
                });
            }
        });
        return () => {
            newSocket.close();
        };
    }, []);
    const markAsRead = () => {
        setUnreadCount(0);
    };
    const clearNotifications = () => {
        setNotifications([]);
        setUnreadCount(0);
    };
    return { socket, notifications, unreadCount, markAsRead, clearNotifications };
}
