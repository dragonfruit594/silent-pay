# SilentPay - Privacy-Preserving Payroll Platform

A confidential payroll management system built with Zama's **Fully Homomorphic Encryption (FHE)** on **Sepolia**. SilentPay enables organizations to manage employee compensation with complete privacy—salaries, balances, and payment amounts remain encrypted on-chain.

## 🚀 Key Features

- **Encrypted Payroll**: Employee salary rates are stored and processed in encrypted form using FHEVM
- **Confidential Payments**: All token transfers and balances are encrypted, visible only to authorized parties
- **Role-Based Access**: Separate dashboards for employers (vault managers) and employees
- **Accrual System**: Employees can claim accrued salaries based on daily rates and elapsed time periods
- **Self-Decryption**: Only wallet owners can decrypt and view their private balances via secure EIP-712 signatures
- **On-Chain Privacy**: All calculations (transfers, balance updates) are performed entirely within FHEVM

## 🛠️ Tech Stack

- **Smart Contracts**: Solidity 0.8.24, Hardhat, `@fhevm/solidity`, OpenZeppelin
- **Frontend**: React (Vite), TypeScript, Tailwind CSS, Ethers v6, Wagmi, RainbowKit
- **Privacy**: Zama FHEVM & Relayer SDK
- **Network**: Sepolia Testnet

## 📋 Contracts

- **SilentUSDC (sUSDC)**: Confidential token following ERC7984 pattern for encrypted balances and transfers
- **SilentVault**: Manages employee enrollment, salary accrual, and payment distribution
- **SilentPayFactory**: Factory contract for creating and managing multiple vault instances

## 📦 Setup & Deployment

### Prerequisites
- Node.js and npm
- MetaMask or compatible Web3 wallet
- Sepolia ETH for deployment and transactions
- Private key in `.env` file (for deployment)

### 1. Smart Contracts
```bash
cd contracts
npm install
npx hardhat compile

# Deploy contracts to Sepolia
npx hardhat run scripts/deploy-silentpay.ts --network sepolia

# Initialize a vault (after deployment)
npx hardhat run scripts/init-silentpay.ts --network sepolia
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```

## 🔐 How it Works

### For Employers:
1. **Mint Tokens**: Create encrypted sUSDC tokens for payroll
2. **Deposit to Vault**: Fund the vault with encrypted tokens
3. **Add Employees**: Enroll team members with encrypted daily salary rates
4. **Make Payments**: Send accrued payments to employees (encrypted amounts)

### For Employees:
1. **View Encrypted Balance**: Wallet balance is encrypted and private
2. **Reveal Salary**: Decrypt and view your daily rate (optional)
3. **Claim Salary**: Withdraw accrued compensation based on daily rate × elapsed days
4. **Privacy**: Your salary information remains encrypted on-chain

## 🔒 Privacy Features

- **Encrypted Balances**: All token balances are stored as encrypted values (euint32)
- **Private Salary Rates**: Employee compensation rates are encrypted when enrolled
- **Confidential Transfers**: Token transfers use encrypted amounts, not visible on-chain
- **Selective Decryption**: Only authorized parties can decrypt specific values via EIP-712 signatures
- **ERC7984 Compliance**: Follows the confidential token standard for encrypted operations

## 📝 Notes

- **Network**: Currently deployed on Sepolia testnet (FHEVM requirement)
- **Accrual Period**: 1 day (testnet-friendly configuration)
- **Gas**: Transactions require higher gas limits due to FHE operations (~5M gas)
- **Decryption**: Viewing balances/salaries requires wallet signature for re-encryption

---

*Built with Privacy by Design using Zama FHEVM.*
