import Head from "next/head";
import { useState } from "react";
import { useAccount, useEnsName } from "wagmi";
import { Space_Grotesk } from "next/font/google";
import { Navbar } from "../components/Navbar";
import { EnsRegistration } from "../components/EnsRegistration";
import { CreateMarketForm } from "../components/CreateMarketForm";
import { ENS_CHAIN_ID } from "../lib/networkConfig";
import Galaxy from "../components/Galaxy";

const spaceGrotesk = Space_Grotesk({
    weight: "400",
    subsets: ["latin"],
});

type Tab = 'profile' | 'register' | 'createmarket';

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
        { id: 'createmarket', label: 'Create Market' },
    ];

    return (
        <div className={`${spaceGrotesk.className} relative min-h-screen bg-[#0a0a0b] text-white selection:bg-blue-500/30 selection:text-white overflow-x-hidden no-scrollbar`}>
            <Head>
                <title>ENS Profile | OnlyTruth</title>
                <meta name="description" content="Manage your ENS profile and markets" />
                <style>{`html, body { scrollbar-width: none; -ms-overflow-style: none; } html::-webkit-scrollbar, body::-webkit-scrollbar { display: none; }`}</style>
            </Head>

            {/* Galaxy background */}
            <div className="fixed inset-0 z-0 pointer-events-none" style={{ width: "100%", height: "100%" }}>
                <Galaxy
                    mouseRepulsion={false} mouseInteraction={false} density={0.7}
                    glowIntensity={0.2} saturation={0.4} hueShift={140}
                    twinkleIntensity={0.9} rotationSpeed={0.05} repulsionStrength={8}
                    autoCenterRepulsion={0} starSpeed={0.3} speed={0.3}
                />
            </div>
            {/* Dark overlay for content readability */}
            <div className="fixed inset-0 z-0 pointer-events-none bg-[#0a0a0b]/40" />
            <div className="fixed inset-0 z-0 pointer-events-none bg-black/40" />

            <div className="relative z-10 flex min-h-screen flex-col">
                <Navbar />

                <main className="mx-auto flex-1 w-full max-w-[1440px] px-6 pt-4 pb-12">
                    <div className="max-w-4xl mx-auto">
                        {!isConnected ? (
                            <div className="rounded-3xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl p-12 text-center">
                                <h2 className="text-xl font-bold mb-4 text-white">Please connect your wallet</h2>
                                <p className="text-zinc-400">Connect your wallet to access your ENS profile and create markets.</p>
                            </div>
                        ) : (
                            <div className="rounded-3xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl overflow-hidden min-h-[600px]">
                                {/* Tab Navigation */}
                                <div className="flex border-b border-white/[0.06] px-6 pt-6">
                                    {tabs.map((tab) => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id)}
                                            className={`px-6 py-4 font-medium transition-colors relative text-sm ${activeTab === tab.id
                                                ? 'text-white'
                                                : 'text-zinc-500 hover:text-zinc-300'
                                                }`}
                                        >
                                            {tab.label}
                                            {activeTab === tab.id && (
                                                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                                            )}
                                        </button>
                                    ))}
                                </div>

                                {/* Tab Content */}
                                <div className="p-8">
                                    {activeTab === 'profile' && (
                                        isLoading ? (
                                            <div className="flex justify-center py-20">
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
                                            </div>
                                        ) : ensName ? (
                                            <div className="space-y-6">
                                                <div>
                                                    <h1 className="text-3xl font-bold mb-2 text-white">Welcome, {ensName}</h1>
                                                    <p className="text-zinc-400">
                                                        Your ENS profile is active and ready to use.
                                                    </p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center py-12">
                                                <h2 className="text-xl font-bold mb-4 text-white">No ENS Name Found</h2>
                                                <p className="text-zinc-400 mb-6">
                                                    You don't have an ENS name set as your primary name yet.
                                                </p>
                                                <button
                                                    onClick={() => setActiveTab('register')}
                                                    className="px-6 py-3 rounded-xl bg-blue-600 font-bold text-white hover:bg-blue-500 transition-colors"
                                                >
                                                    Register a new name
                                                </button>
                                            </div>
                                        )
                                    )}

                                    {activeTab === 'register' && (
                                        <div className="max-w-2xl mx-auto">
                                            <EnsRegistration />
                                        </div>
                                    )}

                                    {activeTab === 'createmarket' && (
                                        <div className="space-y-8">
                                            <div>
                                                <h2 className="text-xl font-bold mb-2 text-white">
                                                    Create Prediction Market
                                                </h2>
                                                <p className="text-zinc-400">
                                                    Creates 8 corner subdomains for a 3-event market.
                                                    Users can send ETH to any corner to receive tokens.
                                                </p>
                                            </div>

                                            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6">
                                                <CreateMarketForm />
                                            </div>


                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </main>

                <footer className="mt-auto border-t border-white/5 bg-white/5 backdrop-blur-xl py-8">
                    <div className="mx-auto max-w-[1440px] px-6 flex justify-between items-center text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                        <span>&copy; 2026 OnlyTruth</span>
                        <div className="flex gap-6">
                            <a href="#" className="hover:text-white transition-colors">Twitter</a>
                            <a href="#" className="hover:text-white transition-colors">Discord</a>
                            <a href="#" className="hover:text-white transition-colors">Privacy</a>
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
}
