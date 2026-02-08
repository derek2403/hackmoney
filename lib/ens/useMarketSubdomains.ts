import { useState, useCallback, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { namehash } from 'viem';
import { NAME_WRAPPER_ABI } from '../abis/NameWrapper';
import { NAME_WRAPPER_ADDRESS, ENS_CHAIN_ID, ENS_PUBLIC_RESOLVER_ADDRESS, PARENT_DOMAIN } from '../networkConfig';

// Public Resolver ABI for setAddr function
const PUBLIC_RESOLVER_ABI = [
    {
        inputs: [
            { name: 'node', type: 'bytes32' },
            { name: 'a', type: 'address' }
        ],
        name: 'setAddr',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function'
    }
] as const;

// All 8 corners for a 3-event market
export const CORNERS = ['nnn', 'nny', 'nyn', 'nyy', 'ynn', 'yny', 'yyn', 'yyy'] as const;
export type Corner = typeof CORNERS[number];

export type MarketSubdomainStep =
    | 'idle'
    | 'creatingSubdomain'   // Creating subdomain N
    | 'settingAddress'      // Setting address for subdomain N
    | 'success'
    | 'error';

export interface MarketSubdomainProgress {
    step: MarketSubdomainStep;
    currentCornerIndex: number;  // 0-7
    currentCorner: Corner | null;
    completedCorners: Corner[];
    hash: `0x${string}` | undefined;
    setAddrHash: `0x${string}` | undefined;
}

export interface UseMarketSubdomainsOptions {
    parentName?: string;  // defaults to PARENT_DOMAIN
}

export interface UseMarketSubdomainsReturn {
    progress: MarketSubdomainProgress;
    error: Error | null;
    createMarketSubdomains: (
        marketName: string,
        receiverAddresses: readonly [`0x${string}`, `0x${string}`, `0x${string}`, `0x${string}`, `0x${string}`, `0x${string}`, `0x${string}`, `0x${string}`]
    ) => void;
    reset: () => void;
}

// Default expiry: 1 year from now
const ONE_YEAR_SECONDS = BigInt(365 * 24 * 60 * 60);

export const useMarketSubdomains = ({
    parentName = PARENT_DOMAIN
}: UseMarketSubdomainsOptions = {}): UseMarketSubdomainsReturn => {
    const { address } = useAccount();
    const [error, setError] = useState<Error | null>(null);

    // Progress state
    const [step, setStep] = useState<MarketSubdomainStep>('idle');
    const [currentCornerIndex, setCurrentCornerIndex] = useState(0);
    const [completedCorners, setCompletedCorners] = useState<Corner[]>([]);

    // Pending data
    const [pendingMarketName, setPendingMarketName] = useState<string | null>(null);
    const [pendingReceivers, setPendingReceivers] = useState<readonly `0x${string}`[] | null>(null);

    // Calculate parent node hash
    const parentNode = namehash(parentName) as `0x${string}`;

    // Write contract hooks
    const {
        writeContract: writeSubnode,
        data: hash,
        error: subnodeError,
        reset: resetSubnode
    } = useWriteContract();

    const {
        writeContract: writeSetAddr,
        data: setAddrHash,
        error: setAddrError,
        reset: resetSetAddr
    } = useWriteContract();

    // Wait for confirmations
    const { isSuccess: isSubnodeConfirmed, error: subnodeConfirmError } = useWaitForTransactionReceipt({
        hash,
        chainId: ENS_CHAIN_ID
    });

    const { isSuccess: isSetAddrConfirmed, error: setAddrConfirmError } = useWaitForTransactionReceipt({
        hash: setAddrHash,
        chainId: ENS_CHAIN_ID
    });

    // Get current corner
    const currentCorner = step !== 'idle' && step !== 'success' && step !== 'error'
        ? CORNERS[currentCornerIndex]
        : null;

    // Start batch creation
    const createMarketSubdomains = useCallback((
        marketName: string,
        receiverAddresses: readonly [`0x${string}`, `0x${string}`, `0x${string}`, `0x${string}`, `0x${string}`, `0x${string}`, `0x${string}`, `0x${string}`]
    ) => {
        if (!address) {
            setError(new Error('Wallet not connected'));
            return;
        }

        setError(null);
        setStep('creatingSubdomain');
        setCurrentCornerIndex(0);
        setCompletedCorners([]);
        setPendingMarketName(marketName);
        setPendingReceivers(receiverAddresses);

        // Start with first corner
        const corner = CORNERS[0];
        const label = `${marketName}-${corner}`;
        const expiryTimestamp = BigInt(Math.floor(Date.now() / 1000)) + ONE_YEAR_SECONDS;

        console.log(`[MarketSubdomains] Creating subdomain 1/8: ${label}.${parentName}`);

        writeSubnode({
            address: NAME_WRAPPER_ADDRESS,
            abi: NAME_WRAPPER_ABI,
            functionName: 'setSubnodeRecord',
            args: [
                parentNode,
                label,
                address,
                ENS_PUBLIC_RESOLVER_ADDRESS,
                BigInt(0),
                0,
                expiryTimestamp
            ],
            chainId: ENS_CHAIN_ID
        });
    }, [address, parentNode, parentName, writeSubnode]);

    // After subdomain created, set address
    useEffect(() => {
        if (isSubnodeConfirmed && step === 'creatingSubdomain' && pendingMarketName && pendingReceivers && currentCorner) {
            console.log(`[MarketSubdomains] Setting address for corner ${currentCorner}`);
            setStep('settingAddress');

            const label = `${pendingMarketName}-${currentCorner}`;
            const fullSubdomain = `${label}.${parentName}`;
            const subdomainNode = namehash(fullSubdomain) as `0x${string}`;
            const receiverAddress = pendingReceivers[currentCornerIndex];

            writeSetAddr({
                address: ENS_PUBLIC_RESOLVER_ADDRESS,
                abi: PUBLIC_RESOLVER_ABI,
                functionName: 'setAddr',
                args: [subdomainNode, receiverAddress],
                chainId: ENS_CHAIN_ID
            });
        }
    }, [isSubnodeConfirmed, step, pendingMarketName, pendingReceivers, currentCorner, currentCornerIndex, parentName, writeSetAddr]);

    // After address set, move to next corner or finish
    useEffect(() => {
        if (isSetAddrConfirmed && step === 'settingAddress' && currentCorner && pendingMarketName && pendingReceivers && address) {
            // Mark corner as complete
            setCompletedCorners(prev => [...prev, currentCorner]);

            const nextIndex = currentCornerIndex + 1;

            if (nextIndex >= 8) {
                // All done!
                console.log('[MarketSubdomains] All 8 subdomains created successfully!');
                setStep('success');
                return;
            }

            // Move to next corner
            setCurrentCornerIndex(nextIndex);
            setStep('creatingSubdomain');

            resetSubnode();
            resetSetAddr();

            const nextCorner = CORNERS[nextIndex];
            const label = `${pendingMarketName}-${nextCorner}`;
            const expiryTimestamp = BigInt(Math.floor(Date.now() / 1000)) + ONE_YEAR_SECONDS;

            console.log(`[MarketSubdomains] Creating subdomain ${nextIndex + 1}/8: ${label}.${parentName}`);

            writeSubnode({
                address: NAME_WRAPPER_ADDRESS,
                abi: NAME_WRAPPER_ABI,
                functionName: 'setSubnodeRecord',
                args: [
                    parentNode,
                    label,
                    address,
                    ENS_PUBLIC_RESOLVER_ADDRESS,
                    BigInt(0),
                    0,
                    expiryTimestamp
                ],
                chainId: ENS_CHAIN_ID
            });
        }
    }, [isSetAddrConfirmed, step, currentCorner, currentCornerIndex, pendingMarketName, pendingReceivers, address, parentName, parentNode, writeSubnode, resetSubnode, resetSetAddr]);

    // Reset function
    const reset = useCallback(() => {
        setStep('idle');
        setError(null);
        setCurrentCornerIndex(0);
        setCompletedCorners([]);
        setPendingMarketName(null);
        setPendingReceivers(null);
        resetSubnode();
        resetSetAddr();
    }, [resetSubnode, resetSetAddr]);

    // Handle errors
    useEffect(() => {
        const err = subnodeError || subnodeConfirmError || setAddrError || setAddrConfirmError;
        if (err) {
            console.error('[MarketSubdomains] Error:', err);
            setError(err);
            setStep('error');
        }
    }, [subnodeError, subnodeConfirmError, setAddrError, setAddrConfirmError]);

    return {
        progress: {
            step,
            currentCornerIndex,
            currentCorner,
            completedCorners,
            hash,
            setAddrHash
        },
        error,
        createMarketSubdomains,
        reset
    };
};
