// Yellow Network Workshop - Complete Web3 dApp Demo
// All chapters (1-5) implemented in a single page for testing

import { useState, useEffect, useCallback } from 'react';
import { createWalletClient, custom, type Address, type WalletClient } from 'viem';
import { mainnet } from 'viem/chains';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import {
    createAuthRequestMessage,
    createAuthVerifyMessage,
    createAuthVerifyMessageWithJWT,
    createEIP712AuthMessageSigner,
    createECDSAMessageSigner,
    createGetLedgerBalancesMessage,
    createTransferMessage,
    parseAnyRPCResponse,
    RPCMethod,
    type AuthChallengeResponse,
    type AuthRequestParams,
    type GetLedgerBalancesResponse,
    type BalanceUpdateResponse,
    type TransferResponse,
} from '@erc7824/nitrolite';

// ==================== SESSION KEY UTILITIES ====================
interface SessionKey {
    privateKey: `0x${string}`;
    address: Address;
}

const SESSION_KEY_STORAGE = 'yellow_workshop_session_key';
const JWT_KEY = 'yellow_workshop_jwt_token';

const generateSessionKey = (): SessionKey => {
    const privateKey = generatePrivateKey();
    const account = privateKeyToAccount(privateKey);
    return { privateKey, address: account.address };
};

const getStoredSessionKey = (): SessionKey | null => {
    try {
        if (typeof window === 'undefined') return null;
        const stored = localStorage.getItem(SESSION_KEY_STORAGE);
        if (!stored) return null;
        const parsed = JSON.parse(stored);
        if (!parsed.privateKey || !parsed.address) return null;
        return parsed as SessionKey;
    } catch {
        return null;
    }
};

const storeSessionKey = (sessionKey: SessionKey): void => {
    try {
        localStorage.setItem(SESSION_KEY_STORAGE, JSON.stringify(sessionKey));
    } catch {
        // Storage failed
    }
};

const removeSessionKey = (): void => {
    try {
        localStorage.removeItem(SESSION_KEY_STORAGE);
    } catch { }
};

const storeJWT = (token: string): void => {
    try {
        localStorage.setItem(JWT_KEY, token);
    } catch { }
};

const removeJWT = (): void => {
    try {
        localStorage.removeItem(JWT_KEY);
    } catch { }
};

const getStoredJWT = (): string | null => {
    try {
        if (typeof window === 'undefined') return null;
        return localStorage.getItem(JWT_KEY);
    } catch {
        return null;
    }
};

// ==================== WEBSOCKET SERVICE ====================
type WsStatus = 'Connecting' | 'Connected' | 'Disconnected';
type StatusListener = (status: WsStatus) => void;
type MessageListener = (data: unknown) => void;

class WebSocketService {
    private socket: WebSocket | null = null;
    private status: WsStatus = 'Disconnected';
    private statusListeners: Set<StatusListener> = new Set();
    private messageListeners: Set<MessageListener> = new Set();
    private messageQueue: string[] = [];

    public connect() {
        if (this.socket && this.socket.readyState < 2) return;
        const wsUrl = process.env.NEXT_PUBLIC_NITROLITE_WS_URL || 'wss://clearnet-sandbox.yellow.com/ws';

        this.updateStatus('Connecting');
        this.socket = new WebSocket(wsUrl);

        this.socket.onopen = () => {
            console.log('WebSocket Connected');
            this.updateStatus('Connected');
            this.messageQueue.forEach((msg) => this.socket?.send(msg));
            this.messageQueue = [];
        };

        this.socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.messageListeners.forEach((listener) => listener(data));
            } catch (error) {
                console.error('Error parsing message:', error);
            }
        };

        this.socket.onclose = () => this.updateStatus('Disconnected');
        this.socket.onerror = () => this.updateStatus('Disconnected');
    }

    public send(payload: string) {
        if (this.socket?.readyState === WebSocket.OPEN) {
            this.socket.send(payload);
        } else {
            this.messageQueue.push(payload);
        }
    }

    private updateStatus(newStatus: WsStatus) {
        this.status = newStatus;
        this.statusListeners.forEach((listener) => listener(this.status));
    }

    public addStatusListener(listener: StatusListener) {
        this.statusListeners.add(listener);
        listener(this.status);
    }

    public removeStatusListener(listener: StatusListener) {
        this.statusListeners.delete(listener);
    }

    public addMessageListener(listener: MessageListener) {
        this.messageListeners.add(listener);
    }

    public removeMessageListener(listener: MessageListener) {
        this.messageListeners.delete(listener);
    }
}

// Single instance
const webSocketService = new WebSocketService();

// ==================== MOCK DATA ====================
interface Post {
    id: string;
    title: string;
    content: string;
    authorName: string;
    authorAddress: Address;
    type: string;
    createdAt: string;
}

const mockPosts: Post[] = [
    {
        id: '1',
        title: 'Getting Started with State Channels',
        content: 'State channels enable off-chain transactions with on-chain security guarantees...',
        authorName: 'Alice',
        authorAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f5bC91',
        type: 'Tutorial',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
        id: '2',
        title: 'Understanding EIP-712 Signatures',
        content: 'EIP-712 provides a standard for typed structured data signing in Ethereum...',
        authorName: 'Bob',
        authorAddress: '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199',
        type: 'Deep Dive',
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
        id: '3',
        title: 'Building Gasless Applications',
        content: 'Session keys allow users to interact with dApps without signing every transaction...',
        authorName: 'Charlie',
        authorAddress: '0xdD2FD4581271e230360230F9337D5c0430Bf44C0',
        type: 'Guide',
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
];

// ==================== CONSTANTS ====================
const SESSION_DURATION = 3600; // 1 hour
const AUTH_SCOPE = 'yellow-workshop.app';
const APP_NAME = 'Yellow Workshop';
const TIP_AMOUNT = '0.01';

const getAuthDomain = () => ({ name: APP_NAME });

// ==================== MAIN COMPONENT ====================
export default function YellowWorkshop() {
    // Chapter 1: Wallet connection state
    const [account, setAccount] = useState<Address | null>(null);
    const [walletClient, setWalletClient] = useState<WalletClient | null>(null);

    // Chapter 2: WebSocket connection state
    const [wsStatus, setWsStatus] = useState<WsStatus>('Disconnected');

    // Chapter 3: Authentication state
    const [sessionKey, setSessionKey] = useState<SessionKey | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isAuthAttempted, setIsAuthAttempted] = useState(false);
    const [sessionExpireTimestamp, setSessionExpireTimestamp] = useState<string>('');

    // Chapter 4: Balance state
    const [balances, setBalances] = useState<Record<string, string> | null>(null);
    const [isLoadingBalances, setIsLoadingBalances] = useState(false);

    // Chapter 5: Transfer state
    const [isTransferring, setIsTransferring] = useState(false);
    const [transferStatus, setTransferStatus] = useState<string | null>(null);

    // ==================== CHAPTER 1: WALLET CONNECTION ====================
    const connectWallet = async () => {
        if (typeof window === 'undefined' || !window.ethereum) {
            alert('Please install MetaMask!');
            return;
        }

        try {
            const tempClient = createWalletClient({
                chain: mainnet,
                transport: custom(window.ethereum),
            });
            const [address] = await tempClient.requestAddresses();

            const client = createWalletClient({
                account: address,
                chain: mainnet,
                transport: custom(window.ethereum),
            });

            setWalletClient(client);
            setAccount(address);
        } catch (error) {
            console.error('Failed to connect wallet:', error);
            alert('Failed to connect wallet. Please try again.');
        }
    };

    const formatAddress = (address: Address) => `${address.slice(0, 6)}...${address.slice(-4)}`;

    // ==================== CHAPTER 2: WEBSOCKET INIT ====================
    useEffect(() => {
        // Get or generate session key on startup
        const existingSessionKey = getStoredSessionKey();
        if (existingSessionKey) {
            setSessionKey(existingSessionKey);
        } else {
            const newSessionKey = generateSessionKey();
            storeSessionKey(newSessionKey);
            setSessionKey(newSessionKey);
        }

        webSocketService.addStatusListener(setWsStatus);
        webSocketService.connect();

        return () => {
            webSocketService.removeStatusListener(setWsStatus);
        };
    }, []);

    // ==================== CHAPTER 3: AUTO-AUTHENTICATION ====================
    useEffect(() => {
        if (account && sessionKey && wsStatus === 'Connected' && !isAuthenticated && !isAuthAttempted) {
            setIsAuthAttempted(true);

            // Try JWT re-auth first (no signature needed!)
            const storedJWT = getStoredJWT();
            if (storedJWT) {
                console.log('Attempting JWT re-authentication (no signature needed)...');
                createAuthVerifyMessageWithJWT(storedJWT).then((payload) => {
                    webSocketService.send(payload);
                }).catch((error) => {
                    console.error('JWT auth failed, will try fresh auth:', error);
                    removeJWT();
                    setIsAuthAttempted(false); // Retry with full auth
                });
                return;
            }

            // No JWT - do full auth flow
            const expireTimestamp = String(Math.floor(Date.now() / 1000) + SESSION_DURATION);
            setSessionExpireTimestamp(expireTimestamp);

            const authParams: AuthRequestParams = {
                address: account,
                session_key: sessionKey.address,
                expires_at: BigInt(Math.floor(Date.now() / 1000) + SESSION_DURATION),
                scope: AUTH_SCOPE,
                application: APP_NAME,
                allowances: [
                    { asset: 'ytest.usd', amount: '100' },
                ],
            };

            createAuthRequestMessage(authParams).then((payload) => {
                console.log('Sending auth request (signature required)...');
                webSocketService.send(payload);
            });
        }
    }, [account, sessionKey, wsStatus, isAuthenticated, isAuthAttempted]);

    // ==================== CHAPTER 4: FETCH BALANCES ====================
    useEffect(() => {
        if (isAuthenticated && sessionKey && account) {
            console.log('Authenticated! Fetching ledger balances...');
            setIsLoadingBalances(true);

            const sessionSigner = createECDSAMessageSigner(sessionKey.privateKey);

            createGetLedgerBalancesMessage(sessionSigner, account)
                .then((payload) => {
                    console.log('Sending balance request...');
                    webSocketService.send(payload);
                })
                .catch((error) => {
                    console.error('Failed to create balance request:', error);
                    setIsLoadingBalances(false);
                });
        }
    }, [isAuthenticated, sessionKey, account]);

    // ==================== MESSAGE HANDLER ====================
    useEffect(() => {
        const handleMessage = async (data: unknown) => {
            const response = parseAnyRPCResponse(JSON.stringify(data));

            // Handle auth challenge
            if (
                response.method === RPCMethod.AuthChallenge &&
                walletClient &&
                sessionKey &&
                account &&
                sessionExpireTimestamp
            ) {
                const challengeResponse = response as AuthChallengeResponse;
                console.log('Received auth challenge, signing...');

                const authParams = {
                    scope: AUTH_SCOPE,
                    application: APP_NAME,
                    participant: sessionKey.address,
                    session_key: sessionKey.address,
                    expires_at: BigInt(sessionExpireTimestamp),
                    allowances: [
                        { asset: 'ytest.usd', amount: '100' },
                    ],
                };

                const eip712Signer = createEIP712AuthMessageSigner(walletClient, authParams, getAuthDomain());

                try {
                    const authVerifyPayload = await createAuthVerifyMessage(eip712Signer, challengeResponse);
                    webSocketService.send(authVerifyPayload);
                } catch (error) {
                    console.error('Signature rejected:', error);
                    alert('Signature rejected. Please try again.');
                    setIsAuthAttempted(false);
                }
            }

            // Handle auth success
            if (response.method === RPCMethod.AuthVerify && response.params?.success) {
                console.log('Authentication successful!');
                setIsAuthenticated(true);
                if (response.params.jwtToken) storeJWT(response.params.jwtToken);
            }

            // Handle balance responses
            if (response.method === RPCMethod.GetLedgerBalances) {
                const balanceResponse = response as GetLedgerBalancesResponse;
                const ledgerBalances = balanceResponse.params.ledgerBalances;

                console.log('Received balance response:', ledgerBalances);

                if (ledgerBalances && ledgerBalances.length > 0) {
                    const balancesMap = Object.fromEntries(
                        ledgerBalances.map((balance) => [balance.asset, balance.amount])
                    );
                    setBalances(balancesMap);
                } else {
                    setBalances({});
                }
                setIsLoadingBalances(false);
            }

            // Handle live balance updates
            if (response.method === RPCMethod.BalanceUpdate) {
                const balanceUpdate = response as BalanceUpdateResponse;
                const updates = balanceUpdate.params.balanceUpdates;

                console.log('Live balance update:', updates);
                const balancesMap = Object.fromEntries(
                    updates.map((balance) => [balance.asset, balance.amount])
                );
                setBalances(balancesMap);
            }

            // Handle transfer response
            if (response.method === RPCMethod.Transfer) {
                const transferResponse = response as TransferResponse;
                console.log('Transfer completed:', transferResponse.params);
                setIsTransferring(false);
                setTransferStatus(null);
                alert('Transfer completed successfully!');
            }

            // Handle errors
            if (response.method === RPCMethod.Error) {
                console.error('RPC Error:', response.params);

                if (isTransferring) {
                    setIsTransferring(false);
                    setTransferStatus(null);
                    alert(`Transfer failed: ${response.params.error}`);
                } else {
                    removeJWT();
                    removeSessionKey();
                    alert(`Error: ${response.params.error}`);
                    setIsAuthAttempted(false);
                }
            }
        };

        webSocketService.addMessageListener(handleMessage);
        return () => webSocketService.removeMessageListener(handleMessage);
    }, [walletClient, sessionKey, sessionExpireTimestamp, account, isTransferring]);

    // ==================== CHAPTER 5: TRANSFER FUNCTION ====================
    const handleSupport = useCallback(async (recipient: Address, amount: string) => {
        if (!isAuthenticated || !sessionKey) {
            alert('Please authenticate first');
            return;
        }

        setIsTransferring(true);
        setTransferStatus('Sending support...');

        try {
            const sessionSigner = createECDSAMessageSigner(sessionKey.privateKey);

            const transferPayload = await createTransferMessage(sessionSigner, {
                destination: recipient,
                allocations: [
                    {
                        asset: 'ytest.usd',
                        amount: amount,
                    },
                ],
            });

            console.log('Sending transfer request...');
            webSocketService.send(transferPayload);
        } catch (error) {
            console.error('Failed to create transfer:', error);
            setIsTransferring(false);
            setTransferStatus(null);
            alert('Failed to create transfer');
        }
    }, [isAuthenticated, sessionKey]);

    // ==================== HELPER FUNCTIONS ====================
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - date.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) return 'yesterday';
        if (diffDays <= 7) return `${diffDays} days ago`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const getBalance = () => {
        if (isLoadingBalances) return 'Loading...';
        return balances?.['ytest.usd'] ?? '0.00';
    };

    // ==================== RENDER ====================
    return (
        <div className="min-h-screen bg-zinc-950 text-white">
            {/* Header */}
            <header className="border-b border-zinc-800 px-6 py-4">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-yellow-400">Yellow Workshop</h1>
                        <p className="text-sm text-zinc-500">Web3 State Channels Demo</p>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Balance Display */}
                        {isAuthenticated && (
                            <div className="flex items-center gap-2 px-4 py-2 rounded-lg border border-zinc-700 bg-zinc-900">
                                <span className="font-mono text-lg font-semibold">{getBalance()}</span>
                                <span className="text-zinc-400">yUSD</span>
                            </div>
                        )}

                        {/* WebSocket Status */}
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-900">
                            <span
                                className={`w-2.5 h-2.5 rounded-full ${wsStatus === 'Connected'
                                    ? 'bg-green-500'
                                    : wsStatus === 'Connecting'
                                        ? 'bg-yellow-500 animate-pulse'
                                        : 'bg-red-500'
                                    }`}
                            />
                            <span className="text-sm font-mono">{wsStatus}</span>
                        </div>

                        {/* Wallet Button */}
                        {account ? (
                            <div className="flex items-center gap-2">
                                {isAuthenticated ? (
                                    <span className="text-xs text-green-400">✓ Authenticated</span>
                                ) : isAuthAttempted ? (
                                    <span className="text-xs text-yellow-400 animate-pulse">Authenticating...</span>
                                ) : null}
                                <button className="px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 font-mono text-sm">
                                    {formatAddress(account)}
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={connectWallet}
                                className="px-4 py-2 rounded-lg bg-yellow-500 hover:bg-yellow-400 text-black font-semibold transition-colors"
                            >
                                Connect Wallet
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-6xl mx-auto px-6 py-8">
                {/* Transfer Status Banner */}
                {transferStatus && (
                    <div className="mb-6 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-center">
                        {transferStatus}
                    </div>
                )}

                {/* Info Banner */}
                <div className="mb-8 p-4 rounded-lg bg-zinc-900 border border-zinc-800">
                    <h2 className="text-lg font-semibold mb-2">Workshop Demo</h2>
                    <p className="text-zinc-400 text-sm">
                        This page demonstrates the Yellow Network state channel workflow. Connect your wallet
                        to authenticate with the Clearnode, then use the &quot;Support&quot; buttons to send instant,
                        gasless USDC transfers.
                    </p>
                </div>

                {/* Posts Grid */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {mockPosts.map((post, index) => (
                        <article
                            key={post.id}
                            className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden flex flex-col"
                        >
                            <div className="p-6 flex-1">
                                <div className="flex items-center gap-3 mb-4">
                                    <span className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-sm font-bold">
                                        {index + 1}
                                    </span>
                                    <div className="text-xs text-zinc-500">
                                        {post.type} • {formatDate(post.createdAt)}
                                    </div>
                                </div>
                                <h3 className="text-lg font-semibold mb-2">{post.title}</h3>
                                <p className="text-zinc-400 text-sm line-clamp-3">{post.content}</p>
                            </div>

                            <footer className="px-6 py-4 border-t border-zinc-800 flex items-center justify-between">
                                <div className="text-sm">
                                    <span className="text-zinc-500">by </span>
                                    <span className="text-zinc-300">{post.authorName}</span>
                                </div>
                                <button
                                    onClick={() => handleSupport(post.authorAddress, TIP_AMOUNT)}
                                    disabled={!account || !isAuthenticated || isTransferring}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${!account
                                        ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                                        : !isAuthenticated
                                            ? 'bg-zinc-800 text-zinc-400 cursor-wait'
                                            : isTransferring
                                                ? 'bg-yellow-500/50 text-yellow-900 cursor-wait'
                                                : 'bg-yellow-500 hover:bg-yellow-400 text-black cursor-pointer'
                                        }`}
                                >
                                    {!account
                                        ? 'Connect Wallet'
                                        : !isAuthenticated
                                            ? 'Authenticating...'
                                            : isTransferring
                                                ? 'Sending...'
                                                : `Support ${TIP_AMOUNT} yUSD`}
                                </button>
                            </footer>
                        </article>
                    ))}
                </div>

                {/* Debug Info (Development) */}
                <div className="mt-12 p-4 rounded-lg bg-zinc-900 border border-zinc-800">
                    <h3 className="text-sm font-semibold text-zinc-400 mb-3">Debug Info</h3>
                    <div className="grid gap-2 text-xs font-mono text-zinc-500">
                        <div>Account: {account ?? 'Not connected'}</div>
                        <div>Session Key: {sessionKey?.address ?? 'Not generated'}</div>
                        <div>WebSocket: {wsStatus}</div>
                        <div>Authenticated: {isAuthenticated ? 'Yes' : 'No'}</div>
                        <div>Balances: {JSON.stringify(balances) ?? 'None'}</div>
                    </div>
                </div>
            </main>
        </div>
    );
}

// TypeScript declaration for window.ethereum
declare global {
    interface Window {
        ethereum?: {
            request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
            on?: (event: string, callback: (...args: unknown[]) => void) => void;
            removeListener?: (event: string, callback: (...args: unknown[]) => void) => void;
        };
    }
}
