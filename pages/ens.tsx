import { useState } from "react";
import { useAccount, useEnsName } from "wagmi";
import { Header } from "../components/Header";
import { EnsRegistration } from "../components/EnsRegistration";
import { MarketSubdomainForm } from "../components/MarketSubdomainForm";
import { ENS_CHAIN_ID, PARENT_DOMAIN } from "../lib/networkConfig";

type Tab = 'profile' | 'register' | 'subdomains';

export default function EnsPage() {
    const { address, isConnected } = useAccount();
    const [activeTab, setActiveTab] = useState<Tab>('profile');
    const { data: ensName, isLoading } = useEnsName({
        address,
        chainId: ENS_CHAIN_ID
    });

    const tabs: { id: Tab; label: string }[] = [
        { id: 'profile', label: 'Profile' },
        { id: 'register', label: 'Register Name' },
        { id: 'subdomains', label: 'Market Subdomains' },
    ];

    return (
        <div className="min-h-screen bg-[#f7f8f3]">
            <Header />
            <main className="container mx-auto px-4 py-8">
                <div className="max-w-4xl mx-auto">
                    {!isConnected ? (
                        <div className="text-center py-20">
                            <h2 className="text-xl font-semibold mb-4">Please connect your wallet</h2>
                        </div>
                    ) : (
                        <>
                            {/* Tab Navigation */}
                            <div className="flex gap-2 mb-6 border-b border-gray-200">
                                {tabs.map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`px-4 py-3 font-medium transition-colors relative ${activeTab === tab.id
                                            ? 'text-blue-600'
                                            : 'text-gray-500 hover:text-gray-700'
                                            }`}
                                    >
                                        {tab.label}
                                        {activeTab === tab.id && (
                                            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
                                        )}
                                    </button>
                                ))}
                            </div>

                            {/* Tab Content */}
                            {activeTab === 'profile' && (
                                isLoading ? (
                                    <div className="flex justify-center py-20">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                                    </div>
                                ) : ensName ? (
                                    <div className="p-8 bg-white rounded-xl shadow-sm border border-gray-100">
                                        <h1 className="text-2xl font-bold mb-4">Welcome, {ensName}</h1>
                                        <p className="text-gray-600">
                                            Your ENS profile is active and ready to use.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="p-8 bg-white rounded-xl shadow-sm border border-gray-100">
                                        <h2 className="text-xl font-semibold mb-4">No ENS Name Found</h2>
                                        <p className="text-gray-600 mb-4">
                                            You don't have an ENS name set as your primary name yet.
                                        </p>
                                        <button
                                            onClick={() => setActiveTab('register')}
                                            className="text-blue-600 hover:underline"
                                        >
                                            Register a new name →
                                        </button>
                                    </div>
                                )
                            )}

                            {activeTab === 'register' && (
                                <EnsRegistration />
                            )}

                            {activeTab === 'subdomains' && (
                                <div className="space-y-6">
                                    <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100">
                                        <h2 className="text-xl font-semibold mb-2">
                                            Create Market Subdomain
                                        </h2>
                                        <p className="text-gray-600 mb-6">
                                            Create ENS subdomains for prediction markets under{' '}
                                            <strong>{PARENT_DOMAIN}</strong>
                                        </p>
                                        <MarketSubdomainForm parentDomain={PARENT_DOMAIN} />
                                    </div>

                                    {/* Info Box */}
                                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                        <h3 className="font-medium text-blue-800 mb-2">
                                            How it works
                                        </h3>
                                        <ul className="text-sm text-blue-700 space-y-1">
                                            <li>• Create subdomains like <code>trump2024.{PARENT_DOMAIN}</code></li>
                                            <li>• Set a custom resolver to point to your market contract</li>
                                            <li>• Users can then send funds directly to the ENS name</li>
                                        </ul>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}
