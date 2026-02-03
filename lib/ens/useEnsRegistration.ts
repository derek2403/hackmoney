import { useState, useEffect, useCallback } from 'react';
import { useReadContract, useAccount } from 'wagmi';
import { toHex, encodeFunctionData, namehash } from 'viem';
import { useEnsCommit } from './useEnsCommit';
import { useEnsRegister } from './useEnsRegister';
import { useEnsRentPrice, ONE_YEAR_SECONDS } from './useEnsRentPrice';
import { ETH_REGISTRAR_CONTROLLER_ADDRESS, ENS_CHAIN_ID, ENS_PUBLIC_RESOLVER_ADDRESS } from '../networkConfig';
import { ETH_REGISTRAR_CONTROLLER_ABI } from '../abis/EthRegistrarController';
import type { RegistrationParams, RegistrationStep } from './types';

const STORAGE_KEY_PREFIX = 'ens_registration_';
const MIN_COMMITMENT_AGE = 60; // 60 seconds
const ZERO_BYTES32 = '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`;

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

// Generate a random 32-byte secret
const generateSecret = (): `0x${string}` => {
    const randomBytes = new Uint8Array(32);
    crypto.getRandomValues(randomBytes);
    return toHex(randomBytes);
};

// Get or create secret from localStorage (for recovery if page is refreshed)
const getOrCreateSecret = (name: string): `0x${string}` => {
    const storageKey = `${STORAGE_KEY_PREFIX}${name}`;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
        return stored as `0x${string}`;
    }
    const newSecret = generateSecret();
    localStorage.setItem(storageKey, newSecret);
    return newSecret;
};

const clearStoredSecret = (name: string) => {
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}${name}`);
};

export interface UseEnsRegistrationOptions {
    name: string;
    duration?: bigint;
}

export interface UseEnsRegistrationReturn {
    step: RegistrationStep;
    price: bigint | undefined;
    isPriceLoading: boolean;
    countdown: number;
    commitTxHash: `0x${string}` | undefined;
    registerTxHash: `0x${string}` | undefined;
    error: Error | null;
    startRegistration: () => void;
    completeRegistration: () => void;
    reset: () => void;
}

export const useEnsRegistration = ({
    name,
    duration = ONE_YEAR_SECONDS
}: UseEnsRegistrationOptions): UseEnsRegistrationReturn => {
    const { address } = useAccount();
    const [step, setStep] = useState<RegistrationStep>('idle');
    const [countdown, setCountdown] = useState(0);
    const [secret, setSecret] = useState<`0x${string}` | null>(null);
    const [registrationParams, setRegistrationParams] = useState<RegistrationParams | null>(null);
    const [error, setError] = useState<Error | null>(null);

    // Fetch rent price
    const { data: priceData, isLoading: isPriceLoading } = useEnsRentPrice(name, duration);
    const price = priceData ? priceData.base + priceData.premium : undefined;

    // Get commitment hash from contract's makeCommitment function (tuple format for Sepolia)
    const {
        data: commitmentHash,
        isLoading: isCommitmentLoading,
        error: commitmentError
    } = useReadContract({
        address: ETH_REGISTRAR_CONTROLLER_ADDRESS,
        abi: ETH_REGISTRAR_CONTROLLER_ABI,
        functionName: 'makeCommitment',
        args: registrationParams ? [registrationParams] : undefined,
        chainId: ENS_CHAIN_ID,
        query: {
            enabled: Boolean(registrationParams),
        },
    });

    // Log for debugging
    useEffect(() => {
        if (registrationParams) {
            console.log('Registration params:', registrationParams);
        }
        if (commitmentHash) {
            console.log('Commitment hash:', commitmentHash);
        }
        if (commitmentError) {
            console.error('Commitment error:', commitmentError);
        }
    }, [registrationParams, commitmentHash, commitmentError]);

    // Commit hook
    const {
        commit,
        hash: commitTxHash,
        isPending: isCommitPending,
        isConfirming: isCommitConfirming,
        isConfirmed: isCommitConfirmed,
        error: commitError,
        reset: resetCommit,
    } = useEnsCommit();

    // Register hook
    const {
        register,
        hash: registerTxHash,
        isPending: isRegisterPending,
        isConfirming: isRegisterConfirming,
        isConfirmed: isRegisterConfirmed,
        error: registerError,
        reset: resetRegister,
    } = useEnsRegister();

    // Build registration params with setAddr data
    const buildRegistrationParams = useCallback((secretValue: `0x${string}`): RegistrationParams | null => {
        if (!address || !name) return null;

        // Calculate the namehash for the full name (name.eth)
        const fullName = `${name}.eth`;
        const node = namehash(fullName);

        // Encode the setAddr call to set the address record
        const setAddrData = encodeFunctionData({
            abi: PUBLIC_RESOLVER_ABI,
            functionName: 'setAddr',
            args: [node, address]
        });

        return {
            label: name,
            owner: address,
            duration,
            secret: secretValue,
            resolver: ENS_PUBLIC_RESOLVER_ADDRESS,
            data: [setAddrData], // Set address record
            reverseRecord: 1, // Set as primary name
            referrer: ZERO_BYTES32,
        };
    }, [address, name, duration]);

    // Start registration (Step 1: Commit)
    const startRegistration = useCallback(() => {
        if (!address || !name) return;

        setError(null);
        const newSecret = getOrCreateSecret(name);
        setSecret(newSecret);

        const params = buildRegistrationParams(newSecret);
        console.log('Built params:', params);
        if (params) {
            setRegistrationParams(params);
            setStep('committing');
        }
    }, [address, name, buildRegistrationParams]);

    // Effect to submit commit once we have the hash
    useEffect(() => {
        console.log('Commit effect check:', {
            step,
            commitmentHash,
            commitTxHash,
            isCommitPending,
            isCommitConfirming,
            isCommitmentLoading
        });
        if (step === 'committing' && commitmentHash && !commitTxHash && !isCommitPending && !isCommitConfirming) {
            console.log('Calling commit with hash:', commitmentHash);
            commit(commitmentHash);
        }
    }, [step, commitmentHash, commitTxHash, isCommitPending, isCommitConfirming, commit, isCommitmentLoading]);

    // Handle commitment error
    useEffect(() => {
        if (commitmentError && step === 'committing') {
            console.error('makeCommitment failed:', commitmentError);
            setError(new Error(`Failed to generate commitment: ${commitmentError.message}`));
            setStep('error');
        }
    }, [commitmentError, step]);

    // Complete registration (Step 2: Register)
    const completeRegistration = useCallback(() => {
        if (!price || !registrationParams) return;

        // Add 5% buffer for price fluctuations
        const valueWithBuffer = (price * BigInt(105)) / BigInt(100);

        setStep('registering');
        register(registrationParams, valueWithBuffer);
    }, [price, registrationParams, register]);

    // Reset state
    const reset = useCallback(() => {
        setStep('idle');
        setCountdown(0);
        setSecret(null);
        setRegistrationParams(null);
        setError(null);
        resetCommit();
        resetRegister();
        if (name) clearStoredSecret(name);
    }, [name, resetCommit, resetRegister]);

    // Handle commit confirmation -> start countdown
    useEffect(() => {
        if (isCommitConfirmed && step === 'committing') {
            setStep('waiting');
            setCountdown(MIN_COMMITMENT_AGE);
        }
    }, [isCommitConfirmed, step]);

    // Countdown timer
    useEffect(() => {
        if (step !== 'waiting' || countdown <= 0) return;

        const timer = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [step, countdown]);

    // Handle register confirmation -> success
    useEffect(() => {
        if (isRegisterConfirmed && step === 'registering') {
            setStep('success');
            if (name) clearStoredSecret(name);
        }
    }, [isRegisterConfirmed, step, name]);

    // Handle errors
    useEffect(() => {
        if (commitError) {
            setError(commitError);
            setStep('error');
        }
        if (registerError) {
            setError(registerError);
            setStep('error');
        }
    }, [commitError, registerError]);

    return {
        step,
        price,
        isPriceLoading,
        countdown,
        commitTxHash,
        registerTxHash,
        error,
        startRegistration,
        completeRegistration,
        reset,
    };
};
