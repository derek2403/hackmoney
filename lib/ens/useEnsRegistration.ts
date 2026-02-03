import { useState, useEffect, useCallback } from 'react';
import { useReadContract, useAccount } from 'wagmi';
import { toHex } from 'viem';
import { useEnsCommit } from './useEnsCommit';
import { useEnsRegister } from './useEnsRegister';
import { useEnsRentPrice, ONE_YEAR_SECONDS } from './useEnsRentPrice';
import { ETH_REGISTRAR_CONTROLLER_ADDRESS, ENS_CHAIN_ID, ENS_PUBLIC_RESOLVER_ADDRESS } from '../networkConfig';
import { ETH_REGISTRAR_CONTROLLER_ABI } from '../abis/EthRegistrarController';
import type { Registration, RegistrationStep } from './types';

const STORAGE_KEY_PREFIX = 'ens_registration_';
const MIN_COMMITMENT_AGE = 60; // 60 seconds

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
    const [registration, setRegistration] = useState<Registration | null>(null);
    const [error, setError] = useState<Error | null>(null);

    // Fetch rent price
    const { data: priceData, isLoading: isPriceLoading } = useEnsRentPrice(name, duration);
    const price = priceData ? priceData.base + priceData.premium : undefined;

    // Get commitment hash from contract's makeCommitment function
    const { data: commitmentHash, isLoading: isCommitmentLoading } = useReadContract({
        address: ETH_REGISTRAR_CONTROLLER_ADDRESS,
        abi: ETH_REGISTRAR_CONTROLLER_ABI,
        functionName: 'makeCommitment',
        args: registration ? [registration] : undefined,
        chainId: ENS_CHAIN_ID,
        query: {
            enabled: Boolean(registration),
        },
    });

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

    // Build registration struct
    const buildRegistration = useCallback((secretValue: `0x${string}`): Registration | null => {
        if (!address) return null;
        return {
            label: name,
            owner: address,
            duration,
            secret: secretValue,
            resolver: ENS_PUBLIC_RESOLVER_ADDRESS,
            data: [],
            reverseRecord: 0, // No reverse record by default
            referrer: '0x0000000000000000000000000000000000000000000000000000000000000000',
        };
    }, [address, name, duration]);

    // Start registration (Step 1: Commit)
    const startRegistration = useCallback(() => {
        if (!address || !name) return;

        setError(null);
        const newSecret = getOrCreateSecret(name);
        setSecret(newSecret);

        const reg = buildRegistration(newSecret);
        if (reg) {
            setRegistration(reg);
            setStep('committing');
        }
    }, [address, name, buildRegistration]);

    // Effect to submit commit once we have the hash
    useEffect(() => {
        if (step === 'committing' && commitmentHash && !commitTxHash && !isCommitPending && !isCommitConfirming) {
            commit(commitmentHash);
        }
    }, [step, commitmentHash, commitTxHash, isCommitPending, isCommitConfirming, commit]);

    // Complete registration (Step 2: Register)
    const completeRegistration = useCallback(() => {
        if (!price || !registration) return;

        // Add 5% buffer for price fluctuations
        const valueWithBuffer = (price * BigInt(105)) / BigInt(100);

        setStep('registering');
        register(registration, valueWithBuffer);
    }, [price, registration, register]);

    // Reset state
    const reset = useCallback(() => {
        setStep('idle');
        setCountdown(0);
        setSecret(null);
        setRegistration(null);
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
