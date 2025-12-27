import React, { useMemo } from 'react';
import type { UiTx } from './EmployerDashboard';
import { useImmediateAsyncAction } from '../hooks/useImmediateAsyncAction';

interface EmployeeDashboardProps {
  address: string;
  tokenSymbol?: string;

  walletBalance: number | string;
  monthlySalary: number | string; // decrypted rate (or placeholder)

  history: UiTx[];
  loading: boolean;

  onRevealWalletBalance: () => Promise<void>;
  onRevealSalary: () => Promise<void>;
  onClaim: () => Promise<void>;
}

const EmployeeDashboard: React.FC<EmployeeDashboardProps> = ({
  address,
  walletBalance,
  monthlySalary,
  history,
  loading,
  onRevealWalletBalance,
  onRevealSalary,
  onClaim,
}) => {
  const recent = useMemo(() => history.slice(0, 10), [history]);

  const salaryNumber = typeof monthlySalary === 'number' ? monthlySalary : undefined;
  // Allow claiming even if salary isn't revealed yet (it can still succeed on-chain).
  // Only hard-disable when we know it's 0, or while loading.
  const claimDisabled = loading || salaryNumber === 0;

  const btnBase = 'w-full py-2.5 rounded-lg text-sm font-semibold transition-colors';
  const revealWallet = useImmediateAsyncAction();
  const revealSalary = useImmediateAsyncAction();
  const claim = useImmediateAsyncAction();

  return (
    <div className="space-y-6">
      {/* Top row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-full">
          <p className="text-sm font-medium text-slate-500 mb-1">My Wallet Balance</p>
          <h3 className="text-3xl font-bold text-slate-900">
            {typeof walletBalance === 'number' ? `$${walletBalance.toLocaleString()}` : walletBalance}
          </h3>
          <p className="text-xs text-emerald-600 mt-2 font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
            Liquid funds
          </p>
          <div className="mt-auto pt-4">
            <button
              onClick={() => {
                if (loading || revealWallet.busy) return;
                revealWallet.run(onRevealWalletBalance);
              }}
              className={`${btnBase} ${
                revealWallet.busy
                  ? 'bg-slate-700 text-white cursor-wait transition-none duration-0'
                  : 'bg-slate-900 text-white hover:bg-slate-800 transition-colors duration-150 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed'
              }`}
              disabled={loading || revealWallet.busy}
            >
              {revealWallet.busy ? 'Revealing...' : 'Reveal / Sync'}
            </button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-full">
          <p className="text-sm font-medium text-slate-500 mb-1">Salary Rate</p>
          <h3 className="text-3xl font-bold text-slate-900">
            {typeof monthlySalary === 'number' ? `$${monthlySalary.toLocaleString()}` : monthlySalary}
          </h3>
          <p className="text-xs text-slate-400 mt-2 font-medium">This is the encrypted daily rate (accrues every day). It does not change after claiming.</p>
          <div className="mt-auto pt-4">
            <button
              onClick={() => {
                if (loading || revealSalary.busy) return;
                revealSalary.run(onRevealSalary);
              }}
              className={`${btnBase} ${
                revealSalary.busy
                  ? 'bg-slate-700 text-white cursor-wait transition-none duration-0'
                  : 'bg-slate-900 text-white hover:bg-slate-800 transition-colors duration-150 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed'
              }`}
              disabled={loading || revealSalary.busy}
            >
              {revealSalary.busy ? 'Revealing...' : 'Reveal Salary'}
            </button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-full">
          <p className="text-sm font-medium text-slate-500 mb-1">Claim Payout</p>
          <h3 className="text-3xl font-bold text-slate-900">
            {typeof monthlySalary === 'number' ? `$${monthlySalary.toLocaleString()}` : monthlySalary}
          </h3>
          <p className="text-xs text-slate-400 mt-2 font-medium">
            Claim sends the accrued payout (daily rate × days) to <span className="font-mono">{address.substring(0, 10)}...</span>
          </p>
          <div className="mt-auto pt-4">
            <button
              onClick={() => {
                if (claimDisabled || claim.busy) return;
                claim.run(async () => {
                  try {
                    await onClaim();
                  } catch (e) {
                    console.error('Claim failed:', e);
                  }
                });
              }}
              disabled={claimDisabled || claim.busy}
              className={`${btnBase} ${
                claim.busy
                  ? 'bg-indigo-700 text-white cursor-wait transition-none duration-0'
                  : !claimDisabled
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700 transition-colors duration-150'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              {claim.busy ? 'Claiming...' : 'Claim to My Wallet'}
            </button>
          </div>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 gap-6">
        {/* Activity */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
              <h4 className="font-bold text-slate-800 uppercase text-xs tracking-wider">Payment Activity</h4>
              <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-500 font-mono">LATEST_TXS</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3">Type</th>
                    <th className="px-6 py-3">Transaction ID</th>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recent.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic text-sm">
                        No recent activity found.
                      </td>
                    </tr>
                  ) : (
                    recent.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <span
                            className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                              tx.type === 'CLAIM' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {tx.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-slate-400">{tx.id.slice(0, 18)}...</td>
                        <td className="px-6 py-4 text-xs text-slate-500">{new Date(tx.timestamp).toLocaleString()}</td>
                        <td className="px-6 py-4 text-sm font-bold text-right text-slate-900">
                          {typeof tx.amount === 'number' ? `$${tx.amount.toLocaleString()}` : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard;


