import React from 'react';
import { useToast, Toast as ToastType } from '../context/ToastContext';

const Toast: React.FC<{ toast: ToastType }> = ({ toast }) => {
    const { dismissToast } = useToast();

    const getStyles = () => {
        switch (toast.type) {
            case 'success':
                return {
                    container: 'bg-white border border-emerald-200 shadow-xl',
                    header: 'text-emerald-700',
                    iconBg: 'bg-emerald-100',
                    icon: (
                        <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    ),
                    progressBarBg: 'bg-emerald-100',
                    progressBar: 'bg-emerald-400',
                };
            case 'error':
                return {
                    container: 'bg-white border border-rose-200 shadow-xl',
                    header: 'text-rose-700',
                    iconBg: 'bg-rose-100',
                    icon: (
                        <svg className="w-5 h-5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    ),
                    progressBarBg: 'bg-rose-100',
                    progressBar: 'bg-rose-400',
                };
            default:
                return {
                    container: 'bg-white border border-slate-200 shadow-xl',
                    header: 'text-slate-700',
                    iconBg: 'bg-slate-100',
                    icon: (
                        <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    ),
                    progressBarBg: 'bg-slate-100',
                    progressBar: 'bg-slate-400',
                };
        }
    };

    const styles = getStyles();

    const getExplorerUrl = (txHash: string) => {
        return `https://sepolia.etherscan.io/tx/${txHash}`;
    };

    return (
        <div className={`${styles.container} rounded-2xl overflow-hidden transform transition-all duration-300 ease-out`}>
            <div className="px-4 py-3 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className={`shrink-0 w-8 h-8 rounded-lg ${styles.iconBg} flex items-center justify-center mt-0.5`}>
                        {styles.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className={`text-xs font-bold uppercase tracking-wider ${styles.header}`}>
                            {toast.type === 'success' ? 'Success' : toast.type === 'error' ? 'Error' : 'Info'}
                        </div>
                        <div className="mt-1 text-sm text-slate-800 break-words">{toast.message}</div>
                        {toast.txHash && (
                            <a
                                href={getExplorerUrl(toast.txHash)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-2 inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                            >
                                <span>View on Etherscan</span>
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                            </a>
                        )}
                    </div>
                </div>
                <button
                    onClick={() => dismissToast(toast.id)}
                    className="shrink-0 w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
                    aria-label="Dismiss"
                    title="Dismiss"
                >
                    ×
                </button>
            </div>
            <div className={`h-1 ${styles.progressBarBg}`}>
                <div className={`h-1 w-full ${styles.progressBar} animate-shrink`} style={{ animationDuration: toast.type === 'success' ? '5s' : '7s' }} />
            </div>
        </div>
    );
};

export const ToastContainer: React.FC = () => {
    const { toasts } = useToast();

    if (toasts.length === 0) return null;

    return (
        <div className="fixed top-4 right-4 z-50 w-[92vw] max-w-md space-y-3">
            {toasts.map((toast) => (
                <Toast key={toast.id} toast={toast} />
            ))}
        </div>
    );
};

