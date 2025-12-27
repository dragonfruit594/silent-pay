import React from 'react';
import Header from './components/Header';
import { useSilentPay } from './hooks/useSilentPay';
import { useFhevm } from './components/FhevmProvider';
import { useToast } from './context/ToastContext';
import { ToastContainer } from './components/Toast';
import ActiveVault from './abi/ActiveVault.json';
import EmployerDashboard, { UiTx } from './components/EmployerDashboard';
import EmployeeDashboard from './components/EmployeeDashboard';

function App() {
    const [members, setMembers] = React.useState<{ address: string; decodedRate?: number }[]>([]);
    const { error: fhevmError } = useFhevm();
    const { account } = useFhevm();
    const { mintToken, deposit, addMember, pushPayment, claimSalary, getConfidentialBalance, getVaultBalance, decryptRate, getMembers, loading, error, clearError } = useSilentPay();
    const { showToast } = useToast();

    const [tab, setTab] = React.useState<'employer' | 'employee'>('employer');
    const [history, setHistory] = React.useState<UiTx[]>([]);
    const [vaultBalance, setVaultBalance] = React.useState<number | string>('•••••');
    const [walletBalance, setWalletBalance] = React.useState<number | string>('•••••');
    const [mySalary, setMySalary] = React.useState<number | string>('•••••');
    const [dismissedError, setDismissedError] = React.useState<string | null>(null);

    const fetchMembers = React.useCallback(async () => {
        const list = await getMembers();
        setMembers(list);
    }, [getMembers]);

    React.useEffect(() => {
        fetchMembers();
    }, [fetchMembers]);

    const rawUiError = fhevmError || error;
    const uiError = React.useMemo(() => {
        if (!rawUiError) return null;
        // Friendly mapping for common revert to avoid confusing users.
        if (rawUiError.includes('Too early')) {
            return 'You already claimed recently. Please wait until the next day (next accrual period) to claim again.';
        }
        return rawUiError;
    }, [rawUiError]);
    const showErrorBanner = Boolean(uiError && uiError !== dismissedError);

    const addTx = React.useCallback((tx: Omit<UiTx, 'id' | 'timestamp'> & { id?: string }) => {
        const fallbackId = `tx_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
        const id = tx.id ?? fallbackId;
        // Avoid spreading `id` back over itself (and possibly overwriting with undefined)
        // by stripping it from the object we spread into the final UiTx.
        const { id: _ignored, ...rest } = tx;
        setHistory((h) => [{ id, timestamp: Date.now(), ...rest }, ...h]);
    }, []);

    const handleRevealVault = React.useCallback(async () => {
        const val = await getVaultBalance();
        if (val !== undefined) setVaultBalance(val);
        addTx({ type: 'REVEAL', amount: typeof val === 'number' ? val : undefined });
    }, [getVaultBalance, addTx]);

    const handleRevealWallet = React.useCallback(async () => {
        const val = await getConfidentialBalance();
        if (val !== undefined) setWalletBalance(val);
        addTx({ type: 'REVEAL', amount: typeof val === 'number' ? val : undefined });
    }, [getConfidentialBalance, addTx]);

    const handleRevealMySalary = React.useCallback(async () => {
        if (!account) return;
        const val = await decryptRate(account);
        if (val !== undefined) setMySalary(val);
    }, [account, decryptRate]);

    const handleMint = React.useCallback(async (amt: number) => {
        const txHash = await mintToken(amt);
        if (txHash) {
            addTx({ type: 'MINT', amount: amt });
            showToast(`Successfully minted $${amt.toLocaleString()} sUSDC`, 'success', txHash);
        }
    }, [mintToken, addTx, showToast]);

    const handleDeposit = React.useCallback(async (amt: number) => {
        try {
            await deposit(amt);
            addTx({ type: 'DEPOSIT', amount: amt });
            showToast(`Successfully deposited $${amt.toLocaleString()} to vault`, 'success');
            await handleRevealVault();
        } catch (e) {
            // Error already handled by useSilentPay
        }
    }, [deposit, addTx, handleRevealVault, showToast]);

    const handleAddMember = React.useCallback(async (addr: string, rate: number) => {
        try {
            await addMember(addr, rate);
            addTx({ type: 'ONBOARD', amount: rate, to: addr });
            showToast(`Successfully added member with rate $${rate.toLocaleString()}/day`, 'success');
            await fetchMembers();
        } catch (e) {
            // Error already handled by useSilentPay
        }
    }, [addMember, addTx, fetchMembers, showToast]);

    const handlePayMember = React.useCallback(async (addr: string) => {
        try {
            await pushPayment(addr);
            addTx({ type: 'PAY', to: addr });
            showToast(`Successfully sent payment to ${addr.slice(0, 6)}...${addr.slice(-4)}`, 'success');
            await handleRevealVault();
        } catch (e) {
            // Error already handled by useSilentPay
        }
    }, [pushPayment, addTx, handleRevealVault, showToast]);

    const handleDecryptMemberRate = React.useCallback(async (addr: string) => {
        const rate = await decryptRate(addr);
        setMembers((prev) => prev.map((m) => (m.address === addr ? { ...m, decodedRate: rate } : m)));
    }, [decryptRate]);

    const handleClaim = React.useCallback(async () => {
        try {
            const txHash = await claimSalary();
            // If claim failed (reverted or blocked by pre-check), don't sync/decrypt balances.
            if (!txHash) return;
            addTx({
                type: 'CLAIM',
                amount: typeof mySalary === 'number' ? mySalary : undefined,
                id: txHash || undefined,
            });
            showToast(
                `Successfully claimed salary${typeof mySalary === 'number' ? ` ($${mySalary.toLocaleString()})` : ''}`,
                'success',
                txHash
            );
            await handleRevealWallet();
        } catch (e) {
            // `claimSalary` already sets `error` for UI; keep this to avoid unhandled rejections.
            console.error('Claim error:', e);
        }
    }, [claimSalary, addTx, handleRevealWallet, mySalary, showToast]);

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900">
            <Header activeTab={tab} onTabChange={setTab} />
            <ToastContainer />

            <main className="w-full md:w-3/5 mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
                {/* Toast-style popup (non-blocking). */}
                {showErrorBanner && uiError ? (
                    <div className="fixed top-4 right-4 z-50 w-[92vw] max-w-md">
                        <div className="bg-white border border-rose-200 text-slate-900 rounded-2xl shadow-xl overflow-hidden">
                            <div className="px-4 py-3 flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="text-xs font-bold uppercase tracking-wider text-rose-700">Action required</div>
                                    <div className="mt-1 text-sm text-slate-800 break-words">{uiError}</div>
                                </div>
                                <button
                                    onClick={() => {
                                        setDismissedError(uiError);
                                        // Only clear hook-level errors; FHEVM init errors are managed by provider.
                                        if (error) clearError();
                                    }}
                                    className="shrink-0 w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
                                    aria-label="Dismiss"
                                    title="Dismiss"
                                >
                                    ×
                                </button>
                            </div>
                            <div className="h-1 bg-rose-100">
                                <div className="h-1 w-full bg-rose-400" />
                            </div>
                        </div>
                    </div>
                ) : null}
                {tab === 'employer' ? (
                    <EmployerDashboard
                        vaultName={ActiveVault.name}
                        vaultAddress={ActiveVault.address}
                        vaultBalance={vaultBalance}
                        employerWalletBalance={walletBalance}
                        members={members}
                        onRevealVaultBalance={handleRevealVault}
                        onRevealEmployerWalletBalance={handleRevealWallet}
                        onMint={handleMint}
                        onDeposit={handleDeposit}
                        onAddMember={handleAddMember}
                        onPayMember={handlePayMember}
                        onDecryptMemberRate={handleDecryptMemberRate}
                        onRefreshMembers={fetchMembers}
                    />
                ) : (
                    <EmployeeDashboard
                        address={account || '—'}
                        walletBalance={walletBalance}
                        monthlySalary={mySalary}
                        history={history}
                        loading={loading}
                        onRevealWalletBalance={handleRevealWallet}
                        onRevealSalary={handleRevealMySalary}
                        onClaim={handleClaim}
                    />
                )}

                <footer className="pt-16 pb-8 text-center text-slate-500 text-sm border-t border-slate-200">
                    <p>© 2025 SilentPay Ecosystem • Powered by Zama FHE</p>
                </footer>
            </main>
        </div>
    );
}

export default App;
