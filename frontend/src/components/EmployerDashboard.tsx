import React, { useState } from 'react';
import { useImmediateAsyncAction, useImmediateAsyncKeyed } from '../hooks/useImmediateAsyncAction';

type TxType = 'MINT' | 'DEPOSIT' | 'ONBOARD' | 'PAY' | 'CLAIM' | 'REVEAL';

export interface UiTx {
  id: string;
  type: TxType;
  amount?: number;
  to?: string;
  timestamp: number;
}

export interface EmployerMemberRow {
  address: string;
  decodedRate?: number;
}

interface EmployerDashboardProps {
  vaultName: string;
  vaultAddress: string;
  tokenSymbol?: string;

  vaultBalance: number | string;
  employerWalletBalance: number | string;

  members: EmployerMemberRow[];
  onRevealVaultBalance: () => Promise<void>;
  onRevealEmployerWalletBalance: () => Promise<void>;
  onMint: (amount: number) => Promise<void> | void;
  onDeposit: (amount: number) => Promise<void> | void;
  onAddMember: (addr: string, rate: number) => Promise<void> | void;
  onPayMember: (addr: string) => Promise<void> | void;
  onDecryptMemberRate: (addr: string) => Promise<void> | void;
  onRefreshMembers: () => Promise<void> | void;
}

const EmployerDashboard: React.FC<EmployerDashboardProps> = ({
  vaultName,
  vaultAddress,
  tokenSymbol = 'sUSDC',
  vaultBalance,
  employerWalletBalance,
  members,
  onRevealVaultBalance,
  onRevealEmployerWalletBalance,
  onMint,
  onDeposit,
  onAddMember,
  onPayMember,
  onDecryptMemberRate,
  onRefreshMembers,
}) => {
  const [amount, setAmount] = useState(1000);
  const [newMemberAddr, setNewMemberAddr] = useState('');
  const [newMemberRate, setNewMemberRate] = useState(50);
  const [quickPayAddr, setQuickPayAddr] = useState('');
  const revealVault = useImmediateAsyncAction();
  const quickPay = useImmediateAsyncAction();
  const revealWallet = useImmediateAsyncAction();
  const mint = useImmediateAsyncAction();
  const deposit = useImmediateAsyncAction();
  const refreshMembers = useImmediateAsyncAction();
  const addMember = useImmediateAsyncAction();
  const rowActions = useImmediateAsyncKeyed();

  return (
    <div className="space-y-6">
      {/* Top row: 3 cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <p className="text-sm font-medium text-slate-500 mb-1">Vault Balance</p>
            <button
              onClick={() => {
                if (revealVault.busy) return;
                revealVault.run(onRevealVaultBalance);
              }}
              className={`shrink-0 px-4 py-2 rounded-lg text-sm font-semibold ${
                revealVault.busy
                  ? 'bg-slate-700 text-white cursor-wait transition-none duration-0'
                  : 'bg-slate-900 text-white hover:bg-slate-800 transition-colors duration-150 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed'
              }`}
              disabled={revealVault.busy}
            >
              {revealVault.busy ? 'Revealing...' : 'Reveal'}
            </button>
          </div>
          <h3 className="text-3xl font-bold text-slate-900 mt-1">
            {typeof vaultBalance === 'number' ? `$${vaultBalance.toLocaleString()}` : vaultBalance}
          </h3>
          <p className="text-xs text-slate-400 mt-2 font-medium">
            Vault: <span className="font-mono">{vaultAddress.slice(0, 10)}...</span>
          </p>

          <div className="mt-6 pt-6 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Quick Pay (Admin)</h4>
            <div className="mt-3 space-y-3">
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Member address</label>
              <input
                value={quickPayAddr}
                onChange={(e) => setQuickPayAddr(e.target.value)}
                placeholder="Member address"
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
              <div className="pt-2">
                <button
                  onClick={() => {
                    if (quickPay.busy) return;
                    quickPay.run(() => onPayMember(quickPayAddr));
                  }}
                  className={`w-full px-4 py-2.5 rounded-lg text-sm font-bold ${
                    quickPay.busy
                      ? 'bg-emerald-700 text-white cursor-wait transition-none duration-0'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700 transition-colors duration-150 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed'
                  }`}
                  disabled={quickPay.busy}
                >
                  <span className="inline-flex items-center justify-center gap-2">
                    {quickPay.busy ? (
                      <span className="w-4 h-4 rounded-full border-2 border-white/60 border-t-white animate-spin" aria-hidden="true" />
                    ) : null}
                    {quickPay.busy ? 'Sending...' : 'Send'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <p className="text-sm font-medium text-slate-500 mb-1">Employer Wallet</p>
            <button
              onClick={() => {
                if (revealWallet.busy) return;
                revealWallet.run(onRevealEmployerWalletBalance);
              }}
              className={`shrink-0 px-4 py-2 rounded-lg text-sm font-semibold ${
                revealWallet.busy
                  ? 'bg-slate-700 text-white cursor-wait transition-none duration-0'
                  : 'bg-slate-900 text-white hover:bg-slate-800 transition-colors duration-150 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed'
              }`}
              disabled={revealWallet.busy}
            >
              {revealWallet.busy ? 'Revealing...' : 'Reveal'}
            </button>
          </div>
          <h3 className="text-3xl font-bold text-slate-900 mt-1">
            {typeof employerWalletBalance === 'number'
              ? `$${employerWalletBalance.toLocaleString()}`
              : employerWalletBalance}
          </h3>
          <p className="text-xs text-slate-400 mt-2 font-medium">Token: {tokenSymbol}</p>

          <div className="mt-6 pt-6 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Treasury Actions</h4>
            <div className="mt-3 space-y-3">
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Amount</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  onClick={() => {
                    if (mint.busy) return;
                    mint.run(() => onMint(amount));
                  }}
                  className={`py-2.5 rounded-lg text-sm font-bold ${
                    mint.busy
                      ? 'bg-slate-700 text-white cursor-wait duration-0 transition-none'
                      : 'bg-slate-900 text-white hover:bg-slate-800 active:bg-slate-900 transition-colors duration-150 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed'
                  }`}
                  disabled={mint.busy}
                >
                  <span className="inline-flex items-center justify-center gap-2">
                    {mint.busy ? (
                      <span
                        className="w-4 h-4 rounded-full border-2 border-white/60 border-t-white animate-spin"
                        aria-hidden="true"
                      />
                    ) : null}
                    {mint.busy ? 'Minting...' : 'Mint'}
                  </span>
                </button>
                <button
                  onClick={() => {
                    if (deposit.busy) return;
                    deposit.run(() => onDeposit(amount));
                  }}
                  className={`py-2.5 rounded-lg text-sm font-bold ${
                    deposit.busy
                      ? 'bg-indigo-700 text-white cursor-wait transition-none duration-0'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700 transition-colors duration-150 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed'
                  }`}
                  disabled={deposit.busy}
                >
                  <span className="inline-flex items-center justify-center gap-2">
                    {deposit.busy ? (
                      <span className="w-4 h-4 rounded-full border-2 border-white/60 border-t-white animate-spin" aria-hidden="true" />
                    ) : null}
                    {deposit.busy ? 'Depositing...' : 'Deposit'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 gap-6">
        {/* Left (2/3): employee registry */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h4 className="font-bold text-slate-800">Employee Registry</h4>
                <p className="text-xs text-slate-400">Org: {vaultName}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (refreshMembers.busy) return;
                    refreshMembers.run(onRefreshMembers);
                  }}
                  className={`px-3 py-2 text-xs font-bold rounded-lg ${
                    refreshMembers.busy
                      ? 'bg-slate-100 text-slate-500 cursor-wait transition-none duration-0 border border-slate-200'
                      : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors duration-150 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed'
                  }`}
                  disabled={refreshMembers.busy}
                >
                  {refreshMembers.busy ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>
            </div>
            {/* Onboard New Talent (merged into registry card) */}
            <div className="px-6 py-4 border-b border-slate-100 bg-white">
              <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Onboard New Talent</h5>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-6 gap-2">
                <div className="md:col-span-4">
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Wallet Address</label>
                  <input
                    value={newMemberAddr}
                    onChange={(e) => setNewMemberAddr(e.target.value)}
                    placeholder="0x..."
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>
                <div className="md:col-span-1">
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Daily Rate</label>
                  <input
                    type="number"
                    value={newMemberRate}
                    onChange={(e) => setNewMemberRate(Number(e.target.value))}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>
                <div className="md:col-span-1 flex items-end">
                  <button
                    onClick={() => {
                      if (addMember.busy) return;
                      addMember.run(() => onAddMember(newMemberAddr, newMemberRate));
                    }}
                    className={`w-full py-2.5 rounded-lg text-sm font-bold ${
                      addMember.busy
                        ? 'bg-indigo-700 text-white cursor-wait transition-none duration-0'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700 transition-colors duration-150 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed'
                    }`}
                    disabled={addMember.busy}
                  >
                    <span className="inline-flex items-center justify-center gap-2">
                      {addMember.busy ? (
                        <span className="w-4 h-4 rounded-full border-2 border-white/60 border-t-white animate-spin" aria-hidden="true" />
                      ) : null}
                      {addMember.busy ? 'Adding...' : 'Add'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3">Address</th>
                    <th className="px-6 py-3">Monthly</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {members.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-10 text-center text-slate-400 italic text-sm">
                        No employees yet.
                      </td>
                    </tr>
                  ) : (
                    members.map((m) => {
                      const rowRevealKey = `reveal:${m.address.toLowerCase()}`;
                      const rowSendKey = `send:${m.address.toLowerCase()}`;
                      const isRowRevealBusy = rowActions.busyKey === rowRevealKey;
                      const isRowSendBusy = rowActions.busyKey === rowSendKey;

                      return (
                        <tr key={m.address} className="hover:bg-slate-50/50">
                          <td className="px-6 py-4 text-sm font-mono text-slate-500">{m.address}</td>
                          <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                            {m.decodedRate !== undefined ? `$${m.decodedRate.toLocaleString()}` : 'Encrypted'}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="inline-flex gap-2">
                              <button
                                onClick={() => {
                                  if (isRowRevealBusy) return;
                                  rowActions.run(rowRevealKey, () => onDecryptMemberRate(m.address));
                                }}
                                className={`px-3 py-2 text-xs font-bold rounded-lg ${
                                  isRowRevealBusy
                                    ? 'bg-indigo-100 text-indigo-700 cursor-wait transition-none duration-0'
                                    : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors duration-150 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed'
                                }`}
                                disabled={isRowRevealBusy}
                              >
                                {isRowRevealBusy ? 'Revealing...' : 'Reveal'}
                              </button>
                              <button
                                onClick={() => {
                                  if (isRowSendBusy) return;
                                  rowActions.run(rowSendKey, () => onPayMember(m.address));
                                }}
                                className={`px-3 py-2 text-xs font-bold rounded-lg ${
                                  isRowSendBusy
                                    ? 'bg-emerald-700 text-white cursor-wait transition-none duration-0'
                                    : 'bg-emerald-600 text-white hover:bg-emerald-700 transition-colors duration-150 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed'
                                }`}
                                disabled={isRowSendBusy}
                              >
                                {isRowSendBusy ? 'Sending...' : 'Send'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
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

export default EmployerDashboard;


