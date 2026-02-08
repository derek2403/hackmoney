import React, { useEffect, useState } from 'react';
import { usePublicClient } from 'wagmi';
import { SWAP_ROUTER_ADDRESS } from '../lib/networkConfig';
import { formatEther } from 'viem';
import { Navbar } from '../components/Navbar';

// ABI for the events we want to track
const SWAP_ROUTER_EVENTS_ABI = [
    {
        "anonymous": false,
        "inputs": [
            { "indexed": true, "internalType": "string", "name": "marketName", "type": "string" },
            { "indexed": false, "internalType": "string", "name": "corner", "type": "string" },
            { "indexed": true, "internalType": "address", "name": "buyer", "type": "address" },
            { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" },
            { "indexed": true, "internalType": "address", "name": "token", "type": "address" }
        ],
        "name": "CornerPurchased",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            { "indexed": true, "internalType": "string", "name": "marketName", "type": "string" },
            { "indexed": false, "internalType": "address[8]", "name": "tokens", "type": "address[8]" },
            { "indexed": false, "internalType": "address[8]", "name": "receivers", "type": "address[8]" }
        ],
        "name": "MarketCreated",
        "type": "event"
    }
] as const;

type EventLog = {
    eventName: string;
    blockNumber: bigint;
    transactionHash: string;
    args: any;
};

export default function EventsPage() {
    const publicClient = usePublicClient();
    const [events, setEvents] = useState<EventLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchEvents = async () => {
            if (!publicClient) return;

            try {
                const currentBlock = await publicClient.getBlockNumber();
                const fromBlock = currentBlock - 5000n > 0n ? currentBlock - 5000n : 0n;

                const logs = await publicClient.getLogs({
                    address: SWAP_ROUTER_ADDRESS,
                    events: SWAP_ROUTER_EVENTS_ABI,
                    fromBlock // Limit to last 5000 blocks
                });

                // Sort by block number descending (newest first)
                const sortedLogs = logs.sort((a, b) =>
                    Number(b.blockNumber) - Number(a.blockNumber)
                ).map(log => ({
                    eventName: log.eventName,
                    blockNumber: log.blockNumber,
                    transactionHash: log.transactionHash,
                    args: log.args
                }));

                setEvents(sortedLogs);
            } catch (error) {
                console.error("Error fetching events:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchEvents();

        // Set up a poller or subscription for new events
        const interval = setInterval(fetchEvents, 10000);
        return () => clearInterval(interval);
    }, [publicClient]);

    const renderEventDetails = (event: EventLog) => {
        if (event.eventName === 'CornerPurchased') {
            return (
                <div className="space-y-1">
                    <div><span className="text-gray-400">Market:</span> <span className="text-blue-400 font-mono">{event.args.marketName}</span></div>
                    <div><span className="text-gray-400">Corner:</span> <span className="font-mono text-yellow-400">{event.args.corner}</span></div>
                    <div><span className="text-gray-400">Buyer:</span> <a href={`https://sepolia.etherscan.io/address/${event.args.buyer}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline truncate inline-block max-w-[150px] align-bottom">{event.args.buyer}</a></div>
                    <div><span className="text-gray-400">Amount:</span> {event.args.amount ? formatEther(event.args.amount) : '0'} ETH</div>
                    {event.args.token && (
                        <div><span className="text-gray-400">Token:</span> <a href={`https://sepolia.etherscan.io/address/${event.args.token}`} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline truncate inline-block max-w-[150px] align-bottom">{event.args.token}</a></div>
                    )}
                </div>
            );
        } else if (event.eventName === 'MarketCreated') {
            return (
                <div className="space-y-1">
                    <div><span className="text-gray-400">Market Created:</span> <span className="text-green-400 font-bold">{event.args.marketName}</span></div>
                    <div className="text-xs text-gray-500 mt-2">
                        <div>Tokens: {event.args.tokens?.length}</div>
                        <div>Receivers: {event.args.receivers?.length}</div>
                    </div>
                </div>
            );
        }
        return <pre className="text-xs overflow-auto">{JSON.stringify(event.args, null, 2)}</pre>;
    };

    return (
        <div className="min-h-screen bg-black text-white font-mono selection:bg-yellow-500/30">
            <Navbar />
            <div className="max-w-7xl mx-auto px-6 py-6 border-x border-white/10 min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/10 via-black to-black">

                <div className="mt-12 mb-8 flex justify-between items-center">
                    <h1 className="text-3xl font-bold tracking-tighter">
                        CONTRACT <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">EVENTS</span>
                    </h1>
                    <div className="flex flex-col items-end">
                        <div className="text-xs text-gray-500 border border-white/10 px-3 py-1 rounded bg-black/50 mb-2">
                            Auto-refreshing (10s)
                        </div>
                        <div className="text-[10px] font-mono text-gray-600">
                            Watching: <span className="text-gray-400">{SWAP_ROUTER_ADDRESS}</span>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                    </div>
                ) : events.length === 0 ? (
                    <div className="text-center py-24 text-gray-500 border border-dashed border-white/10 rounded-lg">
                        No events found on contract.
                    </div>
                ) : (
                    <div className="border border-white/10 rounded-lg overflow-hidden bg-black/50 backdrop-blur-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-white/10 bg-white/5 text-xs uppercase tracking-wider text-gray-400">
                                        <th className="p-4 font-normal">Event</th>
                                        <th className="p-4 font-normal">Details</th>
                                        <th className="p-4 font-normal">Block</th>
                                        <th className="p-4 font-normal">Tx Hash</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {events.map((event, index) => (
                                        <tr key={`${event.transactionHash}-${index}`} className="group hover:bg-white/5 transition-colors">
                                            <td className="p-4 align-top">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${event.eventName === 'MarketCreated'
                                                    ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                                    : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                                    }`}>
                                                    {event.eventName}
                                                </span>
                                            </td>
                                            <td className="p-4 align-top text-sm">
                                                {renderEventDetails(event)}
                                            </td>
                                            <td className="p-4 align-top text-sm text-gray-500 whitespace-nowrap">
                                                #{event.blockNumber.toString()}
                                            </td>
                                            <td className="p-4 align-top text-sm font-mono">
                                                <a
                                                    href={`https://sepolia.etherscan.io/tx/${event.transactionHash}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-gray-500 hover:text-white transition-colors flex items-center gap-1"
                                                >
                                                    {event.transactionHash.slice(0, 6)}...{event.transactionHash.slice(-4)}
                                                    <svg className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                    </svg>
                                                </a>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
