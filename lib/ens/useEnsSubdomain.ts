import { useState, useCallback, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { namehash } from 'viem';
import { NAME_WRAPPER_ABI } from '../abis/NameWrapper';
import { NAME_WRAPPER_ADDRESS, ENS_CHAIN_ID, ENS_PUBLIC_RESOLVER_ADDRESS } from '../networkConfig';
import type { SubdomainParams, SubdomainStep } from './types';

export interface UseEnsSubdomainOptions {
    parentName: string;  // e.g., "pm.eth"
}

export interface UseEnsSubdomainReturn {
    step: SubdomainStep;
    hash: `0x${string}` | undefined;
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
    const [step, setStep] = useState<SubdomainStep>('idle');
    const [error, setError] = useState<Error | null>(null);

    // Calculate parent node hash
    const parentNode = namehash(parentName) as `0x${string}`;

    // Write contract hook for setSubnodeRecord
    const {
        writeContract,
        data: hash,
        isPending,
        error: writeError,
        reset: resetWrite
    } = useWriteContract();

    // Wait for transaction confirmation
    const {
        isLoading: isConfirming,
        isSuccess: isConfirmed,
        error: confirmError
    } = useWaitForTransactionReceipt({
        hash,
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

        // Calculate expiry (default: 1 year from now)
        const expiryTimestamp = expiry ?? BigInt(Math.floor(Date.now() / 1000)) + ONE_YEAR_SECONDS;

        // No fuses burned by default (0) - parent maintains full control
        const fuses = 0;

        writeContract({
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
    }, [address, parentNode, writeContract]);

    // Reset function
    const reset = useCallback(() => {
        setStep('idle');
        setError(null);
        resetWrite();
    }, [resetWrite]);

    // Handle confirmation
    useEffect(() => {
        if (isConfirmed && step === 'creating') {
            setStep('success');
        }
    }, [isConfirmed, step]);

    // Handle errors
    useEffect(() => {
        if (writeError) {
            setError(writeError);
            setStep('error');
        }
        if (confirmError) {
            setError(confirmError);
            setStep('error');
        }
    }, [writeError, confirmError]);

    return {
        step,
        hash,
        error,
        createSubdomain,
        reset
    };
};
