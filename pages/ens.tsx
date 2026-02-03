import { useAccount, useEnsName } from "wagmi";
import { Header } from "../components/Header";
import { EnsRegistration } from "../components/EnsRegistration";
import { ENS_CHAIN_ID } from "../lib/networkConfig";

export default function EnsPage() {
    const { address, isConnected } = useAccount();
    const { data: ensName, isLoading } = useEnsName({
        address,
        chainId: ENS_CHAIN_ID
    });

    return (
        <div className="min-h-screen bg-[#f7f8f3]">
            <Header />
            <main className="container mx-auto px-4 py-8">
                <div className="max-w-4xl mx-auto">
                    {!isConnected ? (
                        <div className="text-center py-20">
                            <h2 className="text-xl font-semibold mb-4">Please connect your wallet</h2>
                        </div>
                    ) : isLoading ? (
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
                        <EnsRegistration />
                    )}
                </div>
            </main>
        </div>
    );
}
