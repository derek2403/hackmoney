import { useState } from 'react';
import { useEnsSubdomain } from '../lib/ens/useEnsSubdomain';
import { useParentDomainOwnership } from '../lib/ens/useParentDomainOwnership';
import { ENS_PUBLIC_RESOLVER_ADDRESS } from '../lib/networkConfig';

interface MarketSubdomainFormProps {
    parentDomain: string;  // e.g., "pm.eth"
}

export const MarketSubdomainForm: React.FC<MarketSubdomainFormProps> = ({
    parentDomain
}) => {
    const [label, setLabel] = useState('');
    const [resolverAddress, setResolverAddress] = useState<string>(ENS_PUBLIC_RESOLVER_ADDRESS);
    const [useCustomResolver, setUseCustomResolver] = useState(false);

    // Check parent domain ownership
    const {
        isOwner,
        isLoading: isCheckingOwnership,
        isWrapped
    } = useParentDomainOwnership({ parentName: parentDomain });

    // Subdomain creation hook
    const {
        step,
        hash,
        setAddrHash,
        error,
        createSubdomain,
        reset
    } = useEnsSubdomain({ parentName: parentDomain });

    // Validate label (lowercase, alphanumeric, hyphens)
    const isValidLabel = /^[a-z0-9-]+$/.test(label) && label.length >= 3;
    const fullSubdomain = label ? `${label}.${parentDomain}` : '';

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!isValidLabel) return;

        const resolver = useCustomResolver
            ? resolverAddress as `0x${string}`
            : ENS_PUBLIC_RESOLVER_ADDRESS;

        createSubdomain(label, resolver);
    };

    // Not the owner - show message
    if (!isCheckingOwnership && !isOwner) {
        return (
            <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-xl">
                <h3 className="text-lg font-semibold text-yellow-800 mb-2">
                    Parent Domain Required
                </h3>
                <p className="text-yellow-700">
                    You need to own the wrapped ENS name <strong>{parentDomain}</strong> to create subdomains.
                    {!isWrapped && (
                        <span className="block mt-2 text-sm">
                            This domain is not wrapped in the NameWrapper contract.
                        </span>
                    )}
                </p>
            </div>
        );
    }

    // Loading state
    if (isCheckingOwnership) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                <span className="ml-3 text-gray-600">Checking domain ownership...</span>
            </div>
        );
    }

    // Success state
    if (step === 'success') {
        return (
            <div className="p-6 bg-green-50 border border-green-200 rounded-xl">
                <h3 className="text-lg font-semibold text-green-800 mb-2">
                    ✓ Subdomain Created!
                </h3>
                <p className="text-green-700 mb-4">
                    <strong>{fullSubdomain}</strong> has been successfully created.
                </p>
                {hash && (
                    <a
                        href={`https://sepolia.etherscan.io/tx/${hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-green-600 hover:underline"
                    >
                        View transaction →
                    </a>
                )}
                <button
                    onClick={reset}
                    className="mt-4 block w-full py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                    Create Another
                </button>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Label Input */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Market Subdomain Label
                </label>
                <div className="flex items-center">
                    <input
                        type="text"
                        value={label}
                        onChange={(e) => setLabel(e.target.value.toLowerCase())}
                        placeholder="e.g., trump2024"
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        disabled={step === 'creating' || step === 'settingAddress'}
                    />
                    <span className="px-4 py-3 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg text-gray-600">
                        .{parentDomain}
                    </span>
                </div>
                {label && !isValidLabel && (
                    <p className="mt-1 text-sm text-red-600">
                        Label must be at least 3 characters, lowercase letters, numbers, and hyphens only.
                    </p>
                )}
                {fullSubdomain && isValidLabel && (
                    <p className="mt-1 text-sm text-gray-500">
                        Full name: <strong>{fullSubdomain}</strong>
                    </p>
                )}
            </div>

            {/* Custom Resolver Toggle */}
            <div>
                <label className="flex items-center gap-3 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={useCustomResolver}
                        onChange={(e) => setUseCustomResolver(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        disabled={step === 'creating' || step === 'settingAddress'}
                    />
                    <span className="text-sm text-gray-700">
                        Use custom resolver (for market contract)
                    </span>
                </label>
            </div>

            {/* Custom Resolver Input */}
            {useCustomResolver && (
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Resolver Address
                    </label>
                    <input
                        type="text"
                        value={resolverAddress}
                        onChange={(e) => setResolverAddress(e.target.value)}
                        placeholder="0x..."
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono text-sm"
                        disabled={step === 'creating' || step === 'settingAddress'}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                        Enter the market swap router contract address
                    </p>
                </div>
            )}

            {/* Error Display */}
            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700">{error.message}</p>
                    <button
                        type="button"
                        onClick={reset}
                        className="mt-2 text-sm text-red-600 hover:underline"
                    >
                        Try again
                    </button>
                </div>
            )}

            {/* Submit Button */}
            <button
                type="submit"
                disabled={!isValidLabel || step === 'creating' || step === 'settingAddress'}
                className={`w-full py-3 px-6 rounded-lg font-medium transition-all ${!isValidLabel || step === 'creating' || step === 'settingAddress'
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg'
                    }`}
            >
                {step === 'creating' ? (
                    <span className="flex items-center justify-center gap-2">
                        <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                        Step 1/2: Creating Subdomain...
                    </span>
                ) : step === 'settingAddress' ? (
                    <span className="flex items-center justify-center gap-2">
                        <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                        Step 2/2: Setting Address Record...
                    </span>
                ) : (
                    'Create Subdomain'
                )}
            </button>

            {/* Progress Indicator */}
            {(step === 'creating' || step === 'settingAddress') && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-700 mb-2">
                        {step === 'creating'
                            ? '✓ Creating subdomain... Please confirm in your wallet.'
                            : '✓ Subdomain created! Now setting address record so MetaMask can resolve it...'}
                    </p>
                    {hash && (
                        <p className="text-xs text-blue-600">
                            Subdomain TX: {' '}
                            <a
                                href={`https://sepolia.etherscan.io/tx/${hash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:underline"
                            >
                                {hash.slice(0, 10)}...{hash.slice(-8)}
                            </a>
                        </p>
                    )}
                    {setAddrHash && (
                        <p className="text-xs text-blue-600 mt-1">
                            Address TX: {' '}
                            <a
                                href={`https://sepolia.etherscan.io/tx/${setAddrHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:underline"
                            >
                                {setAddrHash.slice(0, 10)}...{setAddrHash.slice(-8)}
                            </a>
                        </p>
                    )}
                </div>
            )}
        </form>
    );
};
