import { useState, useCallback, useEffect, useRef } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { namehash, encodeFunctionData } from 'viem';
import { NAME_WRAPPER_ABI } from '../abis/NameWrapper';
import { NAME_WRAPPER_ADDRESS, ENS_CHAIN_ID, ENS_PUBLIC_RESOLVER_ADDRESS } from '../networkConfig';
import type { SubdomainStep } from './types';

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

// Extended step types to handle the two-transaction flow
export type SubdomainStepExtended =
    | 'idle'
    | 'creating'           // Creating subdomain
    | 'settingAddress'     // Setting address record
    | 'success'
    | 'error';

export interface UseEnsSubdomainOptions {
    parentName: string;  // e.g., "pm.eth"
}

export interface UseEnsSubdomainReturn {
    step: SubdomainStepExtended;
    hash: `0x${string}` | undefined;
    setAddrHash: `0x${string}` | undefined;
    error: Error | null;
    createSubdomain: (
        label: string,
        resolverAddress?: `0x${string}`,
        expiry?: bigint
    ) => void;
    reset: () => void;
}

// Default expiry: 1 year from now
const ONE_YEAR_SECONDS = BigInt(365 * 24 * 60 * 60);

export const useEnsSubdomain = ({
    parentName
}: UseEnsSubdomainOptions): UseEnsSubdomainReturn => {
    const { address } = useAccount();
    const [step, setStep] = useState<SubdomainStepExtended>('idle');
    const [error, setError] = useState<Error | null>(null);
    const [pendingLabel, setPendingLabel] = useState<string | null>(null);
    const [pendingResolver, setPendingResolver] = useState<`0x${string}` | null>(null);

    // Calculate parent node hash
    const parentNode = namehash(parentName) as `0x${string}`;

    // Write contract hook for setSubnodeRecord (Step 1)
    const {
        writeContract: writeSubnode,
        data: hash,
        isPending: isSubnodePending,
        error: subnodeError,
        reset: resetSubnode
    } = useWriteContract();

    // Write contract hook for setAddr (Step 2)
    const {
        writeContract: writeSetAddr,
        data: setAddrHash,
        isPending: isSetAddrPending,
        error: setAddrError,
        reset: resetSetAddr
    } = useWriteContract();

    // Wait for subdomain creation confirmation (Step 1)
    const {
        isLoading: isSubnodeConfirming,
        isSuccess: isSubnodeConfirmed,
        error: subnodeConfirmError
    } = useWaitForTransactionReceipt({
        hash,
        chainId: ENS_CHAIN_ID
    });

    // Wait for setAddr confirmation (Step 2)
    const {
        isLoading: isSetAddrConfirming,
        isSuccess: isSetAddrConfirmed,
        error: setAddrConfirmError
    } = useWaitForTransactionReceipt({
        hash: setAddrHash,
        chainId: ENS_CHAIN_ID
    });

    // Create subdomain function
    const createSubdomain = useCallback((
        label: string,
        resolverAddress: `0x${string}` = ENS_PUBLIC_RESOLVER_ADDRESS,
        expiry?: bigint
    ) => {
        if (!address) {
            setError(new Error('Wallet not connected'));
            return;
        }

        setError(null);
        setStep('creating');
        setPendingLabel(label);
        setPendingResolver(resolverAddress);

        // Calculate expiry (default: 1 year from now)
        const expiryTimestamp = expiry ?? BigInt(Math.floor(Date.now() / 1000)) + ONE_YEAR_SECONDS;

        // No fuses burned by default (0) - parent maintains full control
        const fuses = 0;

        console.log('[Subdomain] Step 1: Creating subdomain', { label, resolverAddress });

        writeSubnode({
            address: NAME_WRAPPER_ADDRESS,
            abi: NAME_WRAPPER_ABI,
            functionName: 'setSubnodeRecord',
            args: [
                parentNode,      // parentNode
                label,           // label
                address,         // owner (caller)
                resolverAddress, // resolver
                BigInt(0),       // ttl
                fuses,           // fuses
                expiryTimestamp  // expiry
            ],
            chainId: ENS_CHAIN_ID
        });
    }, [address, parentNode, writeSubnode]);

    // After subdomain is created, set the address record (Step 2)
    useEffect(() => {
        if (isSubnodeConfirmed && step === 'creating' && pendingLabel && pendingResolver && address) {
            console.log('[Subdomain] Step 2: Setting address record');
            setStep('settingAddress');

            // Calculate the full subdomain name and its namehash
            const fullSubdomain = `${pendingLabel}.${parentName}`;
            const subdomainNode = namehash(fullSubdomain) as `0x${string}`;

            console.log('[Subdomain] Setting addr for', fullSubdomain, 'to', address);

            writeSetAddr({
                address: pendingResolver,
                abi: PUBLIC_RESOLVER_ABI,
                functionName: 'setAddr',
                args: [subdomainNode, address],
                chainId: ENS_CHAIN_ID
            });
        }
    }, [isSubnodeConfirmed, step, pendingLabel, pendingResolver, address, parentName, writeSetAddr]);

    // Handle setAddr confirmation -> success
    useEffect(() => {
        if (isSetAddrConfirmed && step === 'settingAddress') {
            console.log('[Subdomain] Address record set successfully');
            setStep('success');
            setPendingLabel(null);
            setPendingResolver(null);
        }
    }, [isSetAddrConfirmed, step]);

    // Reset function
    const reset = useCallback(() => {
        setStep('idle');
        setError(null);
        setPendingLabel(null);
        setPendingResolver(null);
        resetSubnode();
        resetSetAddr();
    }, [resetSubnode, resetSetAddr]);

    // Handle errors
    useEffect(() => {
        const err = subnodeError || subnodeConfirmError || setAddrError || setAddrConfirmError;
        if (err) {
            console.error('[Subdomain] Error:', err);
            setError(err);
            setStep('error');
        }
    }, [subnodeError, subnodeConfirmError, setAddrError, setAddrConfirmError]);

    return {
        step,
        hash,
        setAddrHash,
        error,
        createSubdomain,
        reset
    };
};
