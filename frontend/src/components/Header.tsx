import { ConnectButton } from '@rainbow-me/rainbowkit';

export type HeaderTab = 'employer' | 'employee';

export interface HeaderProps {
    activeTab?: HeaderTab;
    onTabChange?: (tab: HeaderTab) => void;
}

export default function Header({ activeTab, onTabChange }: HeaderProps) {
    return (
        <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
            <div className="w-full md:w-4/5 mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16 items-center">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">
                            S
                        </div>
                        <span className="text-xl font-bold text-slate-800 tracking-tight">SilentPay</span>
                    </div>

                    <div className="flex bg-slate-100 p-1 rounded-xl">
                        <button
                            onClick={() => onTabChange?.('employer')}
                            className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                                activeTab === 'employer'
                                    ? 'bg-white text-indigo-600 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                            }`}
                            type="button"
                        >
                            Employer
                        </button>
                        <button
                            onClick={() => onTabChange?.('employee')}
                            className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                                activeTab === 'employee'
                                    ? 'bg-white text-indigo-600 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                            }`}
                            type="button"
                        >
                            Employee
                        </button>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex items-center gap-4">
                            <div className="text-right">
                                <p className="text-xs text-slate-500 font-medium">Network</p>
                                <p className="text-sm font-semibold flex items-center gap-1 text-slate-800">
                                    <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                                    Sepolia
                                </p>
                            </div>
                        </div>
                        <ConnectButton />
                    </div>
                </div>
            </div>
        </nav>
    );
}
