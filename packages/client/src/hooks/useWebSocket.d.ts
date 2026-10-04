import { Socket } from 'socket.io-client';
interface Notification {
    id: number;
    grade: number;
    subject_name: string;
    teacher_name: string;
    date: string;
    grade_type: string;
    comment: string | null;
    timestamp: string;
}
export declare function useWebSocket(): {
    socket: Socket<import("@socket.io/component-emitter").DefaultEventsMap, import("@socket.io/component-emitter").DefaultEventsMap>;
    notifications: Notification[];
    unreadCount: number;
    markAsRead: () => void;
    clearNotifications: () => void;
};
export {};
