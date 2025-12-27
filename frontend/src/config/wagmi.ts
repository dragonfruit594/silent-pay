import { createConfig, http } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';

// Use injected wallet only (MetaMask, etc.) to avoid WalletConnect/Reown allowlist warnings.
const connectors = [injected({ target: 'metaMask' }), injected()];

export const config = createConfig({
    chains: [sepolia],
    connectors,
    transports: {
        [sepolia.id]: http(),
    },
});

