import { useState, useCallback } from 'react';
import { BrowserProvider, Contract, getAddress, isAddress } from 'ethers';
import { createEncryptedInput, reencrypt, handleToHex } from '../utils/fhevm';
import { useFhevm } from '../components/FhevmProvider';
import TokenABI from '../abi/SilentUSDC.json';
import VaultABI from '../abi/SilentVault.json';
import ActiveVault from '../abi/ActiveVault.json';

export const useSilentPay = () => {
    const { account, isInitialized } = useFhevm();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const clearError = useCallback(() => setError(null), []);

    const formatUserError = (e: any, fallback: string) => {
        const code = e?.code ?? e?.info?.error?.code;
        // MetaMask user denied (tx or signature)
        if (code === 4001 || code === 'ACTION_REJECTED') {
            return 'Transaction cancelled.';
        }
        const msg =
            e?.reason ||
            e?.shortMessage ||
            e?.info?.error?.message ||
            e?.message ||
            fallback;
        // Prevent giant blobs in UI
        return typeof msg === 'string' && msg.length > 180 ? `${msg.slice(0, 180)}...` : msg;
    };

    const getContract = useCallback(async (data: any, isVault = false, addressOverride?: string) => {
        if (!window.ethereum) throw new Error("No ethereum provider");
        const provider = new BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        return new Contract(
            addressOverride || data.address,
            isVault ? VaultABI.abi : data.abi,
            signer
        );
    }, []);

    const mintToken = async (amount: number): Promise<string | undefined> => {
        if (!account || !isInitialized) {
            setError('Wallet not connected or FHEVM not initialized');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const token = await getContract(TokenABI);
            // Create encrypted input for mint (externalEuint32 with proof)
            const encryptedInput = await createEncryptedInput(TokenABI.address, account, amount);
            const handleHex = handleToHex(encryptedInput.handles[0]);
            // Call mint with gasLimit (similar to zama-stake pattern)
            const tx = await token.mint(handleHex, encryptedInput.inputProof, {
                gasLimit: 5000000
            });
            await tx.wait();
            return tx?.hash;
        } catch (e: any) {
            console.error('Mint error:', e);
            setError(formatUserError(e, 'Mint failed.'));
            return;
        } finally {
            setLoading(false);
        }
    };

    const deposit = async (amount: number) => {
        if (!account || !isInitialized) {
            setError('Wallet not connected or FHEVM not initialized');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const token = await getContract(TokenABI);
            // Create encrypted input for approve (proof for token contract)
            const encryptedInputForApprove = await createEncryptedInput(TokenABI.address, account, amount);
            const handleHexForApprove = handleToHex(encryptedInputForApprove.handles[0]);
            
            // Approve with gasLimit
            const approveTx = await token.approve(ActiveVault.address, handleHexForApprove, encryptedInputForApprove.inputProof, {
                gasLimit: 5000000
            });
            await approveTx.wait();

            const vault = await getContract(VaultABI, true, ActiveVault.address);
            // Create encrypted input for deposit (proof for vault contract - following zama-stake pattern)
            // The vault contract will decode the proof and then call confidentialTransferFrom with euint32
            const encryptedInputForDeposit = await createEncryptedInput(ActiveVault.address, account, amount);
            const handleHexForDeposit = handleToHex(encryptedInputForDeposit.handles[0]);
            
            const depositTx = await vault.depositVault(handleHexForDeposit, encryptedInputForDeposit.inputProof, {
                gasLimit: 5000000
            });
            await depositTx.wait();
        } catch (e: any) {
            console.error('Deposit error:', e);
            setError(formatUserError(e, 'Deposit failed.'));
        } finally {
            setLoading(false);
        }
    };

    const getConfidentialBalance = async (address?: string) => {
        if (!account || !isInitialized) {
            setError('Wallet not connected or FHEVM not initialized');
            return 0;
        }
        try {
            // Use provider (read-only) for view function
            if (!window.ethereum) throw new Error("No ethereum provider");
            const provider = new BrowserProvider(window.ethereum);
            const token = new Contract(TokenABI.address, TokenABI.abi, provider);
            const targetAddr = address || account;
            
            // balanceOf() is view function - simple call
            const handle = await token.balanceOf(targetAddr);
            
            if (!handle || handle === 0n) return 0;
            const clearValue = await reencrypt(handle, TokenABI.address, account);
            return Number(clearValue);
        } catch (e: any) {
            console.error('Get balance error:', e);
            setError(formatUserError(e, 'Failed to fetch balance.'));
            throw e;
        }
    };

    const getVaultBalance = async () => {
        if (!account || !isInitialized) {
            setError('Wallet not connected or FHEVM not initialized');
            return 0;
        }
        try {
            // Use provider (read-only) for view function
            if (!window.ethereum) throw new Error("No ethereum provider");
            const provider = new BrowserProvider(window.ethereum);
            const vault = new Contract(ActiveVault.address, VaultABI.abi, provider);
            
            // getVaultBalance() is view function - simple call
            const handle = await vault.getVaultBalance();
            
            if (!handle || handle === 0n) return 0;
            // vault balance handle is owned by token contract (paymentToken.balanceOf(vault))
            const clearValue = await reencrypt(handle, TokenABI.address, account);
            return Number(clearValue);
        } catch (e: any) {
            console.error('Get vault balance error:', e);
            setError(formatUserError(e, 'Failed to fetch vault balance.'));
            throw e;
        }
    };

    const addMember = async (memberAddr: string, rate: number) => {
        if (!account || !isInitialized) {
            setError('Wallet not connected or FHEVM not initialized');
            return;
        }
        if (!isAddress(memberAddr)) {
            setError('Invalid member address');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const vault = await getContract(VaultABI, true, ActiveVault.address);
            const encryptedRate = await createEncryptedInput(ActiveVault.address, account, rate);
            const handleHex = handleToHex(encryptedRate.handles[0]);
            const tx = await vault.enrollMember(getAddress(memberAddr), handleHex, encryptedRate.inputProof, { gasLimit: 5000000 });
            await tx.wait();
        } catch (e: any) {
            console.error('Add member error:', e);
            setError(formatUserError(e, 'Failed to add member.'));
        } finally {
            setLoading(false);
        }
    };

    const decryptRate = async (memberAddr: string) => {
        if (!account || !isInitialized) {
            setError('Wallet not connected or FHEVM not initialized');
            return 0;
        }
        if (!memberAddr || !isAddress(memberAddr)) {
            setError('Invalid member address');
            return 0;
        }
        try {
            // Use provider (read-only) for view function
            if (!window.ethereum) throw new Error("No ethereum provider");
            const provider = new BrowserProvider(window.ethereum);
            const vault = new Contract(ActiveVault.address, VaultABI.abi, provider);
            
            // getEncryptedRate() is view function - simple call
            const handle = await vault.getEncryptedRate(getAddress(memberAddr));
            
            if (!handle || handle === 0n) return 0;
            const clearValue = await reencrypt(handle, ActiveVault.address, account);
            return Number(clearValue);
        } catch (e: any) {
            console.error('Decrypt rate error:', e);
            setError(formatUserError(e, 'Failed to decrypt rate.'));
            throw e;
        }
    };

    const pushPayment = async (memberAddr: string) => {
        if (!account || !isInitialized) {
            setError('Wallet not connected or FHEVM not initialized');
            return;
        }
        if (!memberAddr || !isAddress(memberAddr)) {
            setError('Invalid member address');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const vault = await getContract(VaultABI, true, ActiveVault.address);
            // Pre-check owner to avoid opaque estimateGas reverts
            const vaultOwner: string = await vault.owner();
            if (vaultOwner?.toLowerCase?.() !== account.toLowerCase()) {
                throw new Error(`Only vault owner can push payment. Vault owner: ${vaultOwner}`);
            }

            // Pre-check: decrypt vault balance and member rate (1 signature via reencryptMany)
            const provider = new BrowserProvider(window.ethereum);
            const vaultRead = new Contract(ActiveVault.address, VaultABI.abi, provider);
            const [vaultBalHandle, rateHandle] = await Promise.all([
                vaultRead.getVaultBalance(),
                vaultRead.getEncryptedRate(getAddress(memberAddr)),
            ]);

            if (!rateHandle || rateHandle === 0n) {
                throw new Error('Member rate is not set (member not enrolled?)');
            }

            // Decrypt (will request signature(s) via Metamask)
            const vaultBal = BigInt((await reencrypt(vaultBalHandle, ActiveVault.address, account)).toString());
            const rate = BigInt((await reencrypt(rateHandle, ActiveVault.address, account)).toString());
            if (vaultBal < rate) {
                throw new Error(`Insufficient vault balance. Vault=${vaultBal} Rate=${rate}`);
            }

            const tx = await vault.pushPayment(getAddress(memberAddr), { gasLimit: 5000000 });
            await tx.wait();
        } catch (e: any) {
            console.error('Push payment error:', e);
            setError(formatUserError(e, 'Push payment failed.'));
        } finally {
            setLoading(false);
        }
    };

    const claimSalary = async (): Promise<string | undefined> => {
        if (!account || !isInitialized) {
            setError('Wallet not connected or FHEVM not initialized');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const vault = await getContract(VaultABI, true, ActiveVault.address);
            // Pre-check onchain status so we can show a friendly message and avoid sending a reverting tx.
            // (Also prevents follow-up decrypt prompts caused by post-claim sync flows.)
            try {
                const provider = new BrowserProvider(window.ethereum);
                const vaultRead = new Contract(ActiveVault.address, VaultABI.abi, provider);
                const status = await (vaultRead as any).getMemberStatus(getAddress(account));
                const hasClaimed: boolean = Boolean(status?.[3]);
                const nextClaimAt: bigint = BigInt(status?.[5] ?? 0n);
                const nowSec = BigInt(Math.floor(Date.now() / 1000));
                // Small grace window to avoid blocking right at the boundary due to local clock skew.
                if (hasClaimed && nextClaimAt > 0n && nowSec + 10n < nextClaimAt) {
                    setError('Too early');
                    return;
                }
            } catch {
                // If ABI is outdated or call fails, fall back to sending the tx (error will be handled below).
            }

            // Bypass estimateGas to avoid opaque "missing revert data" on some wallets/providers.
            const tx = await vault.claimGrant({ gasLimit: 5000000 });
            await tx.wait();
            return tx?.hash;
        } catch (e: any) {
            console.error('Claim salary error:', e);
            const msg =
                e?.reason ||
                e?.shortMessage ||
                e?.info?.error?.message ||
                e?.message ||
                'Failed to claim salary';
            setError(msg);
            return;
        } finally {
            setLoading(false);
        }
    };

    const getMembers = useCallback(async () => {
        if (!account || !isInitialized) return [];
        try {
            const vault = await getContract(VaultABI, true, ActiveVault.address);
            const list: { address: string }[] = [];
            let i = 0;
            while (true) {
                try {
                    const addr: string = await vault.memberList(i);
                    if (addr && isAddress(addr)) {
                        list.push({ address: getAddress(addr) });
                    }
                    i++;
                } catch { break; }
            }
            return list;
        } catch (e) {
            console.error(e);
            return [];
        }
    }, [account, isInitialized, getContract]);

    return {
        mintToken,
        deposit,
        getConfidentialBalance,
        getVaultBalance,
        addMember,
        decryptRate,
        pushPayment,
        claimSalary,
        getMembers,
        loading,
        error,
        clearError
    };
};
