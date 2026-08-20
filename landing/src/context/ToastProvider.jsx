import { useCallback, useRef, useState } from 'react';
import { ToastContext } from './toast-context';

export const ToastProvider = ({ children }) => {
    const [message, setMessage] = useState('');
    const [visible, setVisible] = useState(false);
    const timerRef = useRef(null);

    const showToast = useCallback((text) => {
        clearTimeout(timerRef.current);
        setMessage(text);
        setVisible(true);
        timerRef.current = setTimeout(() => setVisible(false), 3000);
    }, []);

    return (
        <ToastContext.Provider value={showToast}>
            {children}
            <div className="toast" style={{ opacity: visible ? 1 : 0 }}>{message}</div>
        </ToastContext.Provider>
    );
};
