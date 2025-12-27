import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { initializeFheInstance } from '../utils/fhevm';

interface FhevmContextType {
    isInitialized: boolean;
    error: string | null;
    account: string | null;
}

const FhevmContext = createContext<FhevmContextType>({
    isInitialized: false,
    error: null,
    account: null,
});

export const useFhevm = () => useContext(FhevmContext);

export const FhevmProvider = ({ children }: { children: ReactNode }) => {
    const [isInitialized, setIsInitialized] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { address, isConnected } = useAccount();
    const chainId = useChainId();
    const { switchChain } = useSwitchChain();

    // Auto-switch to Sepolia if connected to wrong network (FHEVM only works on Sepolia)
    useEffect(() => {
        if (isConnected && chainId !== sepolia.id) {
            switchChain({ chainId: sepolia.id });
        }
    }, [isConnected, chainId, switchChain]);

    useEffect(() => {
        // Initialize FHEVM when wallet is connected and on correct network
        if (isConnected && address && chainId === sepolia.id) {
            const initFHE = async () => {
                try {
                    await initializeFheInstance();
                    setIsInitialized(true);
                    setError(null);
                } catch (err: any) {
                    console.error("FHEVM init error:", err);
                    setError(err.message || "Failed to initialize FHEVM");
                    setIsInitialized(false);
                }
            };
            initFHE();
        } else {
            setIsInitialized(false);
            if (isConnected && chainId !== sepolia.id) {
                setError("Please switch to Sepolia network");
            } else {
                setError(null);
            }
        }
    }, [isConnected, address, chainId]);

    return (
        <FhevmContext.Provider value={{
            isInitialized,
            error,
            account: address || null
        }}>
            {children}
        </FhevmContext.Provider>
    );
};
