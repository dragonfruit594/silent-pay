import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
    id: string;
    message: string;
    type: ToastType;
    txHash?: string;
}

interface ToastContextType {
    toasts: Toast[];
    showToast: (message: string, type?: ToastType, txHash?: string) => void;
    dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType>({
    toasts: [],
    showToast: () => {},
    dismissToast: () => {},
});

export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }: { children: ReactNode }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((message: string, type: ToastType = 'success', txHash?: string) => {
        const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        const newToast: Toast = { id, message, type, txHash };
        
        setToasts((prev) => [...prev, newToast]);

        // Auto dismiss after 5 seconds for success, 7 seconds for error/info
        const timeout = type === 'success' ? 5000 : 7000;
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, timeout);
    }, []);

    const dismissToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ toasts, showToast, dismissToast }}>
            {children}
        </ToastContext.Provider>
    );
};

