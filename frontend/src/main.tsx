import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { FhevmProvider } from './components/FhevmProvider.tsx'
import { ToastProvider } from './context/ToastContext.tsx'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RainbowKitProvider } from '@rainbow-me/rainbowkit'
import { sepolia } from 'wagmi/chains'
import { config } from './config/wagmi'
import '@rainbow-me/rainbowkit/styles.css'
import './index.css'

const queryClient = new QueryClient()

ReactDOM.createRoot(document.getElementById('root')!).render(
    <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
            <RainbowKitProvider locale="en" initialChain={sepolia}>
                <ToastProvider>
                    <FhevmProvider>
                        <App />
                    </FhevmProvider>
                </ToastProvider>
            </RainbowKitProvider>
        </QueryClientProvider>
    </WagmiProvider>,
)
