import { useState, useEffect } from 'react';
import { useDebounce } from 'use-debounce';
import { formatEther } from 'viem';
import { useAccount } from 'wagmi';
import { useEnsAvailable } from '../lib/ens/useEnsAvailable';
import { useEnsRegistration } from '../lib/ens/useEnsRegistration';
import { ONE_YEAR_SECONDS } from '../lib/ens/useEnsRentPrice';
import { ENS_CHAIN_ID } from '../lib/networkConfig';

const DURATION_OPTIONS = [
    { label: '1 year', value: ONE_YEAR_SECONDS },
    { label: '2 years', value: ONE_YEAR_SECONDS * BigInt(2) },
    { label: '3 years', value: ONE_YEAR_SECONDS * BigInt(3) },
    { label: '5 years', value: ONE_YEAR_SECONDS * BigInt(5) },
];

export const EnsRegistration = () => {
    const { address, chainId } = useAccount();
    const [name, setName] = useState('');
    const [debouncedName] = useDebounce(name, 500);
    const [duration, setDuration] = useState(ONE_YEAR_SECONDS);

    const { data: available, isLoading: isChecking } = useEnsAvailable(debouncedName);

    const {
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
    } = useEnsRegistration({ name: debouncedName, duration });

    const isWrongNetwork = chainId !== ENS_CHAIN_ID;
    const canStartRegistration = name && name.length >= 3 && available && !isWrongNetwork && address;

    // Format price for display
    const formattedPrice = price ? formatEther(price) : null;

    return (
        <div className="flex flex-col items-center justify-center p-8 bg-white/5 rounded-xl border border-white/10 backdrop-blur-md max-w-md mx-auto mt-10">
            <h2 className="text-2xl font-bold mb-4 text-center text-white">
                Claim Your Web3 Identity
            </h2>

            {/* Wrong Network Warning */}
            {isWrongNetwork && (
                <div className="w-full mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-200 text-sm text-center">
                    Please switch to Sepolia network to register ENS names
                </div>
            )}

            {/* Success State */}
            {step === 'success' && (
                <div className="w-full text-center space-y-4">
                    <div className="text-green-500 text-5xl mb-4">🎉</div>
                    <h3 className="text-xl font-bold text-green-400">
                        Congratulations!
                    </h3>
                    <p className="text-zinc-400">
                        You are now the owner of <span className="font-bold text-white">{debouncedName}.eth</span>
                    </p>
                    {registerTxHash && (
                        <a
                            href={`https://sepolia.etherscan.io/tx/${registerTxHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:underline text-sm"
                        >
                            View transaction ↗
                        </a>
                    )}
                    <button
                        onClick={reset}
                        className="mt-4 px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                    >
                        Register another name
                    </button>
                </div>
            )}

            {/* Error State */}
            {step === 'error' && (
                <div className="w-full text-center space-y-4">
                    <div className="text-red-500 text-4xl mb-4">⚠️</div>
                    <h3 className="text-xl font-bold text-red-500">
                        Registration Failed
                    </h3>
                    <p className="text-zinc-400 text-sm">
                        {error?.message || 'An error occurred during registration'}
                    </p>
                    <button
                        onClick={reset}
                        className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            )}

            {/* Main Registration Form */}
            {step !== 'success' && step !== 'error' && (
                <>
                    <p className="text-white mb-6 text-center text-sm">
                        You don't have an ENS name yet. Register one to make your wallet human-readable.
                    </p>

                    <div className="w-full space-y-4">
                        {/* Name Input */}
                        <div className="relative">
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value.toLowerCase().replace('.eth', '').replace(/[^a-z0-9-]/g, ''))}
                                placeholder="yourname"
                                disabled={step !== 'idle'}
                                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-zinc-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all pr-16 disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none">.eth</span>
                        </div>

                        {/* Availability Status */}
                        {debouncedName && debouncedName.length >= 3 && step === 'idle' && (
                            <div className="text-sm flex items-center justify-center gap-2 h-6">
                                {isChecking ? (
                                    <span className="text-zinc-500">Checking...</span>
                                ) : available ? (
                                    <span className="text-emerald-400 font-medium">✨ {debouncedName}.eth is available</span>
                                ) : (
                                    <span className="text-rose-500 font-medium">Taken</span>
                                )}
                            </div>
                        )}

                        {/* Duration Selector */}
                        {step === 'idle' && available && (
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-zinc-400">
                                    Registration Period
                                </label>
                                <div className="grid grid-cols-4 gap-2">
                                    {DURATION_OPTIONS.map((option) => (
                                        <button
                                            key={option.label}
                                            onClick={() => setDuration(option.value)}
                                            className={`py-2 px-3 text-sm rounded-lg border transition-colors ${duration === option.value
                                                ? 'bg-blue-600 text-white border-blue-600'
                                                : 'bg-white/5 text-zinc-400 border-white/10 hover:border-blue-500 hover:text-white'
                                                }`}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Price Display */}
                        {available && formattedPrice && step === 'idle' && (
                            <div className="p-4 bg-white/5 rounded-lg border border-white/5">
                                <div className="flex justify-between items-center">
                                    <span className="text-zinc-400">Registration Cost</span>
                                    <span className="font-bold text-lg text-white">
                                        {isPriceLoading ? '...' : `${parseFloat(formattedPrice).toFixed(6)} ETH`}
                                    </span>
                                </div>
                                <p className="text-xs text-zinc-500 mt-2">
                                    + estimated gas fee • 5% buffer included for price fluctuations
                                </p>
                            </div>
                        )}

                        {/* Step 1: Committing */}
                        {step === 'committing' && (
                            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg text-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-3" />
                                <p className="text-blue-300 font-medium">Step 1 of 2: Submitting commitment...</p>
                                <p className="text-blue-400/60 text-sm mt-1">Please confirm in your wallet</p>
                                {commitTxHash && (
                                    <a
                                        href={`https://sepolia.etherscan.io/tx/${commitTxHash}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-400 hover:underline text-xs mt-2 inline-block"
                                    >
                                        View transaction ↗
                                    </a>
                                )}
                            </div>
                        )}

                        {/* Step 2: Waiting */}
                        {step === 'waiting' && (
                            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-center">
                                <div className="text-3xl mb-2">⏳</div>
                                <p className="text-yellow-200 font-medium">
                                    Waiting {countdown} seconds...
                                </p>
                                <p className="text-yellow-200/60 text-sm mt-1">
                                    This prevents front-running attacks
                                </p>
                                <div className="mt-3 w-full bg-yellow-200 rounded-full h-2">
                                    <div
                                        className="bg-yellow-500 h-2 rounded-full transition-all"
                                        style={{ width: `${((60 - countdown) / 60) * 100}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Step 3: Registering */}
                        {step === 'registering' && (
                            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400 mx-auto mb-3" />
                                <p className="text-emerald-300 font-medium">Step 2 of 2: Completing registration...</p>
                                <p className="text-emerald-400/60 text-sm mt-1">Please confirm payment in your wallet</p>
                                {registerTxHash && (
                                    <a
                                        href={`https://sepolia.etherscan.io/tx/${registerTxHash}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-emerald-400 hover:underline text-xs mt-2 inline-block"
                                    >
                                        View transaction ↗
                                    </a>
                                )}
                            </div>
                        )}

                        {/* Action Buttons */}
                        {step === 'idle' && (
                            <button
                                onClick={startRegistration}
                                disabled={!canStartRegistration || isChecking || isPriceLoading}
                                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Begin Registration
                            </button>
                        )}

                        {step === 'waiting' && countdown === 0 && (
                            <button
                                onClick={completeRegistration}
                                className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors"
                            >
                                Complete Registration ({formattedPrice ? parseFloat(formattedPrice).toFixed(6) : '...'} ETH)
                            </button>
                        )}

                        {/* Cancel/Reset during process */}
                        {(step === 'committing' || step === 'waiting' || step === 'registering') && (
                            <button
                                onClick={reset}
                                className="w-full py-2 text-zinc-500 hover:text-white text-sm transition-colors"
                            >
                                Cancel
                            </button>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};
