import { useState, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useAccount, useReadContract } from 'wagmi';
import { useMarketSubdomains, CORNERS } from '../lib/ens/useMarketSubdomains';
import { SWAP_ROUTER_ABI } from '../lib/abis/SwapRouter';
import { ENS_CHAIN_ID, PARENT_DOMAIN, SWAP_ROUTER_ADDRESS } from '../lib/networkConfig';

interface CreateMarketFormProps {
    swapRouterAddress?: `0x${string}`;
}

type FormStep =
    | 'input'           // User entering market name
    | 'creatingMarket'  // Calling SwapRouter.createMarket
    | 'creatingSubdomains' // Creating 8 ENS subdomains
    | 'success'
    | 'error';

export const CreateMarketForm: React.FC<CreateMarketFormProps> = ({
    swapRouterAddress = SWAP_ROUTER_ADDRESS
}) => {
    const { address } = useAccount();
    const [marketName, setMarketName] = useState('');
    const [formStep, setFormStep] = useState<FormStep>('input');
    const [error, setError] = useState<Error | null>(null);
    const [receiverAddresses, setReceiverAddresses] = useState<readonly `0x${string}`[] | null>(null);

    // Market creation on SwapRouter
    const {
        writeContract,
        data: createMarketHash,
        isPending: isCreatingMarket,
        error: createMarketError,
        reset: resetCreateMarket
    } = useWriteContract();

    const {
        isSuccess: isMarketCreated,
        error: marketConfirmError
    } = useWaitForTransactionReceipt({
        hash: createMarketHash,
        chainId: ENS_CHAIN_ID
    });

    // After market created, read receiver addresses
    const { data: receivers, refetch: refetchReceivers } = useReadContract({
        address: swapRouterAddress,
        abi: SWAP_ROUTER_ABI,
        functionName: 'getMarketReceivers',
        args: [marketName],
        chainId: ENS_CHAIN_ID,
        query: { enabled: false } // Manual trigger
    });

    // ENS subdomain creation
    const {
        progress: subdomainProgress,
        error: subdomainError,
        createMarketSubdomains,
        reset: resetSubdomains
    } = useMarketSubdomains();

    // Validate market name
    const isValidName = /^[a-z0-9]+$/.test(marketName) && marketName.length >= 2 && marketName.length <= 20;

    // Start market creation
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!isValidName || !address) return;

        setError(null);
        setFormStep('creatingMarket');

        writeContract({
            address: swapRouterAddress,
            abi: SWAP_ROUTER_ABI,
            functionName: 'createMarket',
            args: [marketName],
            chainId: ENS_CHAIN_ID
        });
    };

    // After market created, fetch receivers and start subdomain creation
    useEffect(() => {
        if (isMarketCreated && formStep === 'creatingMarket') {
            console.log('[CreateMarket] Market created, fetching receivers...');
            refetchReceivers();
        }
    }, [isMarketCreated, formStep, refetchReceivers]);

    // When receivers fetched, create subdomains
    useEffect(() => {
        if (receivers && formStep === 'creatingMarket') {
            console.log('[CreateMarket] Got receivers, creating subdomains...', receivers);
            setReceiverAddresses(receivers);
            setFormStep('creatingSubdomains');
            createMarketSubdomains(marketName, receivers as readonly [`0x${string}`, `0x${string}`, `0x${string}`, `0x${string}`, `0x${string}`, `0x${string}`, `0x${string}`, `0x${string}`]);
        }
    }, [receivers, formStep, marketName, createMarketSubdomains]);

    // Handle subdomain completion
    useEffect(() => {
        if (subdomainProgress.step === 'success' && formStep === 'creatingSubdomains') {
            setFormStep('success');
        }
    }, [subdomainProgress.step, formStep]);

    // Handle errors
    useEffect(() => {
        const err = createMarketError || marketConfirmError || subdomainError;
        if (err) {
            setError(err);
            setFormStep('error');
        }
    }, [createMarketError, marketConfirmError, subdomainError]);

    // Reset
    const reset = () => {
        setMarketName('');
        setFormStep('input');
        setError(null);
        setReceiverAddresses(null);
        resetCreateMarket();
        resetSubdomains();
    };

    // Success state
    if (formStep === 'success') {
        return (
            <div className="p-6 bg-green-50 border border-green-200 rounded-xl">
                <h3 className="text-lg font-semibold text-green-800 mb-4">
                    ✓ Market Created Successfully!
                </h3>
                <p className="text-green-700 mb-4">
                    <strong>{marketName}</strong> market is ready. 8 corner subdomains created:
                </p>
                <ul className="space-y-1 mb-4">
                    {CORNERS.map((corner, i) => (
                        <li key={corner} className="text-sm text-green-600 font-mono">
                            • {marketName}-{corner}.{PARENT_DOMAIN}
                            {receiverAddresses && (
                                <span className="text-gray-400 ml-2">
                                    → {receiverAddresses[i].slice(0, 8)}...
                                </span>
                            )}
                        </li>
                    ))}
                </ul>
                <p className="text-sm text-green-600 mb-4">
                    Users can now send ETH to any subdomain to receive corner tokens!
                </p>
                <button
                    onClick={reset}
                    className="w-full py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                    Create Another Market
                </button>
            </div>
        );
    }

    // Error state
    if (formStep === 'error') {
        return (
            <div className="p-6 bg-red-50 border border-red-200 rounded-xl">
                <h3 className="text-lg font-semibold text-red-800 mb-2">Error</h3>
                <p className="text-red-700 mb-4">{error?.message}</p>
                <button
                    onClick={reset}
                    className="py-2 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                    Try Again
                </button>
            </div>
        );
    }

    // Progress state
    const isProcessing = formStep === 'creatingMarket' || formStep === 'creatingSubdomains';

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Market Name Input */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Market Name
                </label>
                <div className="flex items-stretch border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
                    <input
                        type="text"
                        value={marketName}
                        onChange={(e) => setMarketName(e.target.value.toLowerCase())}
                        placeholder="e.g., trump2024"
                        className="flex-1 px-4 py-3 border-none outline-none"
                        disabled={isProcessing}
                    />
                    <div className="flex items-center px-4 bg-gray-100 text-gray-500 border-l border-gray-300">
                        .{PARENT_DOMAIN}
                    </div>
                </div>
                {marketName && !isValidName && (
                    <p className="mt-1 text-sm text-red-600">
                        2-20 lowercase letters and numbers only
                    </p>
                )}
                {isValidName && (
                    <p className="mt-1 text-sm text-gray-500">
                        Will create: {marketName}-000.{PARENT_DOMAIN}, ..., {marketName}-111.{PARENT_DOMAIN}
                    </p>
                )}
            </div>

            {/* SwapRouter Address */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    SwapRouter Address
                </label>
                <input
                    type="text"
                    value={swapRouterAddress}
                    disabled
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm text-gray-500"
                />
            </div>

            {/* Progress Indicator */}
            {isProcessing && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    {formStep === 'creatingMarket' && (
                        <p className="text-sm text-blue-700">
                            <span className="animate-pulse">●</span> Creating market on SwapRouter...
                        </p>
                    )}
                    {formStep === 'creatingSubdomains' && (
                        <div>
                            <p className="text-sm text-blue-700 mb-2">
                                <span className="animate-pulse">●</span> Creating ENS subdomains: {subdomainProgress.completedCorners.length + 1}/8
                            </p>
                            <p className="text-xs text-blue-600">
                                Current: {marketName}-{subdomainProgress.currentCorner}.{PARENT_DOMAIN}
                            </p>
                            <div className="mt-2 flex gap-1">
                                {CORNERS.map((corner) => (
                                    <div
                                        key={corner}
                                        className={`h-2 flex-1 rounded ${subdomainProgress.completedCorners.includes(corner)
                                            ? 'bg-green-500'
                                            : corner === subdomainProgress.currentCorner
                                                ? 'bg-blue-500 animate-pulse'
                                                : 'bg-gray-200'
                                            }`}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Submit Button */}
            <button
                type="submit"
                disabled={!isValidName || isProcessing}
                className={`w-full py-3 px-6 rounded-lg font-medium transition-all ${!isValidName || isProcessing
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'
                    }`}
            >
                {isProcessing ? 'Creating Market...' : 'Create Market (8 Corners)'}
            </button>
        </form>
    );
};
