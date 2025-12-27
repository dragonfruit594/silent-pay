import { BrowserProvider, getAddress, hexlify } from "ethers";

let fheInstance: any = null;

export const initializeFheInstance = async () => {
    if (fheInstance) return fheInstance;

    if (typeof window === 'undefined' || !window.ethereum) {
        throw new Error('Ethereum provider not found');
    }

    // @ts-ignore
    const sdk = window.RelayerSDK || window.relayerSDK;
    if (!sdk) {
        throw new Error('RelayerSDK not loaded');
    }

    const { initSDK, createInstance, SepoliaConfig } = sdk;

    await initSDK();

    const config = { ...SepoliaConfig, network: window.ethereum };

    try {
        fheInstance = await createInstance(config);
        return fheInstance;
    } catch (err) {
        console.error('FHEVM initialization failed:', err);
        throw err;
    }
};

export const getFheInstance = () => fheInstance;

export const createEncryptedInput = async (contractAddress: string, userAddress: string, value: number) => {
    const instance = await initializeFheInstance();
    const inputHandle = instance.createEncryptedInput(contractAddress, userAddress);
    inputHandle.add32(value);
    return await inputHandle.encrypt();
};

/**
 * Convert handle from SDK format (byte array) to hex string (bytes32) for contract calls
 * SDK returns handles as byte array, but contract needs hex string
 */
export const handleToHex = (handle: any): string => {
    if (Array.isArray(handle)) {
        // Convert byte array to hex string
        return hexlify(Uint8Array.from(handle));
    } else if (typeof handle === 'string' && handle.startsWith('0x')) {
        // Already hex string
        return handle;
    } else {
        // Try to convert bigint or number to hex
        return hexlify(handle);
    }
};

export const reencrypt = async (handle: bigint, contractAddress: string, userAddress: string) => {
    // ROBUST zero handle check - multiple methods
    const isZeroHandle = (): boolean => {
        if (!handle) return true;
        if (handle === 0n) return true;
        const str = handle.toString();
        if (str === '0') return true;
        // Check hex string format (0x followed by all zeros)
        if (/^0x0+$/i.test(str)) return true;
        // Check hex format from bigint (all zeros)
        try {
            const hex = BigInt(handle).toString(16);
            if (/^0+$/.test(hex)) return true;
        } catch { }
        return false;
    };

    if (isZeroHandle()) {
        return 0;
    }

    const instance = await initializeFheInstance();

    // Ensure addresses are checksummed
    const checksummedContractAddress = getAddress(contractAddress);
    const checksummedUserAddress = getAddress(userAddress);

    // Generate a temporary keypair for re-encryption
    const keypair = instance.generateKeypair();
    const handleStr = handle.toString();

    const handleContractPairs = [
        {
            handle: handleStr,
            contractAddress: checksummedContractAddress,
        },
    ];

    const startTimeStamp = Math.floor(Date.now() / 1000).toString();
    const durationDays = "10";
    const contractAddresses = [checksummedContractAddress];

    // Create EIP-712 signature for authorization
    const eip712 = instance.createEIP712(
        keypair.publicKey,
        contractAddresses,
        startTimeStamp,
        durationDays
    );

    // Request user signature via Metamask
    const provider = new BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    let signature: string;
    try {
        signature = await signer.signTypedData(
            eip712.domain,
            { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
            eip712.message
        );
    } catch (e: any) {
        // Keep raw error for debugging, but surface a short user-friendly message.
        console.error('[reencrypt] signTypedData error (raw):', e);
        const code = e?.code ?? e?.info?.error?.code;
        if (code === 4001 || code === 'ACTION_REJECTED') {
            throw new Error('Transaction cancelled.');
        }
        const msg =
            e?.reason ||
            e?.shortMessage ||
            e?.info?.error?.message ||
            e?.message ||
            'Signature request failed.';
        throw new Error(msg);
    }

    // Perform re-encryption using userDecrypt
    // NOTE: this is an HTTP call to Zama Relayer. It can hang if the relayer/network is unstable.
    // Add timeout + small retry to avoid "pending forever" and surface a real error.
    const userDecryptOnce = async () => {
        return await instance.userDecrypt(
            handleContractPairs,
            keypair.privateKey,
            keypair.publicKey,
            signature.replace("0x", ""),
            contractAddresses,
            checksummedUserAddress,
            startTimeStamp,
            durationDays
        );
    };

    const withTimeout = async <T>(p: Promise<T>, ms: number) => {
        return await Promise.race([
            p,
            new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error(`userDecrypt timeout after ${ms}ms`)), ms)
            ),
        ]);
    };

    let lastErr: any;
    let result: any;
    // Relayer/network can sporadically hang; fail fast so UI doesn't look "pending forever".
    // We retry a couple times without caching signatures (still 1 signature per decrypt request).
    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            // 20s per attempt (keeps UX responsive)
            result = await withTimeout(userDecryptOnce(), 20000);
            break;
        } catch (e) {
            lastErr = e;
            console.error(`[reencrypt] userDecrypt attempt ${attempt} failed:`, e);
            // small backoff
            await new Promise((r) => setTimeout(r, 800 * attempt));
        }
    }
    if (!result) throw lastErr;

    return result[handleStr];
};
