// Yellow Network Workshop - Complete Web3 dApp Demo
// All chapters (1-5) implemented in a single page for testing

import { useState, useEffect, useCallback } from 'react';
import { createWalletClient, createPublicClient, custom, http, type Address, type WalletClient, type PublicClient } from 'viem';
import { sepolia } from 'viem/chains';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import {
    createAuthRequestMessage,
    createAuthVerifyMessage,
    createAuthVerifyMessageWithJWT,
    createEIP712AuthMessageSigner,
    createECDSAMessageSigner,
    createGetLedgerBalancesMessage,
    createGetConfigMessage,
    createGetAssetsMessageV2,
    createTransferMessage,
    createCreateChannelMessage,
    createResizeChannelMessage,
    createCloseChannelMessage,
    createAppSessionMessage,
    createSubmitAppStateMessage,
    createCloseAppSessionMessage,
    createGetAppSessionsMessageV2,
    parseAnyRPCResponse,
    RPCMethod,
    RPCAppStateIntent,
    NitroliteClient,
    WalletStateSigner,
    RPCProtocolVersion,
    type AuthChallengeResponse,
    type AuthRequestParams,
    type GetLedgerBalancesResponse,
    type BalanceUpdateResponse,
    type TransferResponse,
} from '@erc7824/nitrolite';

// ==================== SEPOLIA CONTRACT ADDRESSES ====================
const SEPOLIA_CUSTODY_ADDRESS = '0x019B65A265EB3363822f2752141b3dF16131b262' as const;
const SEPOLIA_ADJUDICATOR_ADDRESS = '0x7c7ccbc98469190849BCC6c926307794fDfB11F2' as const;
// Correct ytest.usd token address from GetAssets API (different from Circle USDC!)
const YTEST_USD_TOKEN = '0xDB9F293e3898c9E5536A3be1b0C56c89d2b32DEb' as const;
const ETH_ADDRESS = '0x0000000000000000000000000000000000000000' as const;
const SEPOLIA_CHAIN_ID = 11155111;

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
    const [walletBalance, setWalletBalance] = useState<string>('0');

    // Chapter 5: Transfer state
    const [isTransferring, setIsTransferring] = useState(false);
    const [transferStatus, setTransferStatus] = useState<string | null>(null);

    // Chapter 6: Channel management state
    const [publicClient, setPublicClient] = useState<PublicClient | null>(null);
    const [nitroliteClient, setNitroliteClient] = useState<NitroliteClient | null>(null);
    const [channelId, setChannelId] = useState<string | null>(null);
    const [channelStatus, setChannelStatus] = useState<'none' | 'creating' | 'open' | 'funding' | 'funded' | 'closing' | 'closed'>('none');
    const [channelBalance, setChannelBalance] = useState<string>('0');
    const [isChannelLoading, setIsChannelLoading] = useState(false);
    // Use the correct ytest.usd token address from GetAssets API
    const [serverToken, setServerToken] = useState<`0x${string}`>(YTEST_USD_TOKEN);

    // Chapter 7: App Session state (instant off-chain payments)
    const [appSessionId, setAppSessionId] = useState<string | null>(null);
    const [appSessionStatus, setAppSessionStatus] = useState<'none' | 'creating' | 'active' | 'closing' | 'closed'>('none');
    const [appSessionPartner, setAppSessionPartner] = useState<string>('');
    const [isAppSessionLoading, setIsAppSessionLoading] = useState(false);
    const [appSessionVersion, setAppSessionVersion] = useState<number>(1);
    const [payerBalance, setPayerBalance] = useState<string>('0');
    const [payeeBalance, setPayeeBalance] = useState<string>('0');
    // ==================== CHAPTER 1: WALLET CONNECTION ====================
    const connectWallet = async () => {
        if (typeof window === 'undefined' || !window.ethereum) {
            alert('Please install MetaMask!');
            return;
        }

        try {
            // First check if we're on Sepolia, if not, request switch
            const chainId = await window.ethereum.request({ method: 'eth_chainId' });
            const sepoliaChainId = '0xaa36a7'; // 11155111 in hex

            if (chainId !== sepoliaChainId) {
                try {
                    await window.ethereum.request({
                        method: 'wallet_switchEthereumChain',
                        params: [{ chainId: sepoliaChainId }],
                    });
                } catch (switchError: any) {
                    // Chain not added, try to add it
                    if (switchError.code === 4902) {
                        await window.ethereum.request({
                            method: 'wallet_addEthereumChain',
                            params: [{
                                chainId: sepoliaChainId,
                                chainName: 'Sepolia',
                                nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
                                rpcUrls: ['https://sepolia.drpc.org'],
                                blockExplorerUrls: ['https://sepolia.etherscan.io'],
                            }],
                        });
                    } else {
                        alert('Please switch to Sepolia network to use channel features');
                        throw switchError;
                    }
                }
            }
            const tempClient = createWalletClient({
                chain: sepolia,
                transport: custom(window.ethereum),
            });
            const [address] = await tempClient.requestAddresses();

            const client = createWalletClient({
                account: address,
                chain: sepolia,
                transport: custom(window.ethereum),
            });

            // Create public client for reading chain state
            const pubClient = createPublicClient({
                chain: sepolia,
                transport: http('https://1rpc.io/sepolia'),
            });

            // Initialize NitroliteClient for on-chain operations
            const nitroClient = new NitroliteClient({
                publicClient: pubClient,
                walletClient: client,
                stateSigner: new WalletStateSigner(client),
                addresses: {
                    custody: SEPOLIA_CUSTODY_ADDRESS,
                    adjudicator: SEPOLIA_ADJUDICATOR_ADDRESS,
                },
                chainId: sepolia.id,
                challengeDuration: BigInt(3600),
            });

            setWalletClient(client);
            setPublicClient(pubClient);
            setNitroliteClient(nitroClient);
            setAccount(address);
            fetchWalletBalance(pubClient, address);
        } catch (error) {
            console.error('Failed to connect wallet:', error);
            alert('Failed to connect wallet. Please try again.');
        }
    };

    const formatAddress = (address: Address) => `${address.slice(0, 6)}...${address.slice(-4)}`;

    // Fetch on-chain ytest.usd wallet balance
    const fetchWalletBalance = useCallback(async (pubClient: PublicClient, userAddress: Address) => {
        try {
            const raw = await pubClient.readContract({
                address: YTEST_USD_TOKEN,
                abi: [{ name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] }],
                functionName: 'balanceOf',
                args: [userAddress],
            }) as bigint;
            // ytest.usd uses 6 decimals based on balance format from ClearNode
            const decimals = await pubClient.readContract({
                address: YTEST_USD_TOKEN,
                abi: [{ name: 'decimals', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint8' }] }],
                functionName: 'decimals',
            }) as number;
            const formatted = (Number(raw) / Math.pow(10, Number(decimals))).toFixed(2);
            setWalletBalance(formatted);
        } catch (error) {
            console.error('Failed to fetch wallet balance:', error);
        }
    }, []);

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
                    { asset: 'ytest.usd', amount: '1000000' },
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
                        { asset: 'ytest.usd', amount: '1000000' },
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

                // Fetch server config to get supported tokens
                const currentSessionKey = sessionKey;
                if (currentSessionKey) {
                    try {
                        const sessionSigner = createECDSAMessageSigner(currentSessionKey.privateKey);
                        const configMsg = await createGetConfigMessage(sessionSigner);
                        webSocketService.send(configMsg);
                        console.log('Fetching server config...');
                    } catch (e) {
                        console.log('Config fetch failed');
                    }
                }
            }

            // Handle config response - get supported token
            if (response.method === RPCMethod.GetConfig) {
                const config = response.params as any;
                console.log('Server config received (JSON):', JSON.stringify(config, null, 2));

                let supportedToken: string | undefined;

                // 1. Try top-level supported_tokens mapping
                if (config?.supported_tokens?.[SEPOLIA_CHAIN_ID]) {
                    supportedToken = config.supported_tokens[SEPOLIA_CHAIN_ID][0];
                }

                // 2. Try nested networks array
                if (!supportedToken && config?.networks) {
                    const sepoliaConfig = config.networks.find((n: any) => n.chainId === SEPOLIA_CHAIN_ID);
                    if (sepoliaConfig) {
                        console.log('Sepolia network config found:', sepoliaConfig);
                        // Try tokens or assets fields
                        supportedToken = sepoliaConfig.tokens?.[0] || sepoliaConfig.assets?.[0]?.address;
                    }
                }

                if (supportedToken) {
                    const tokenToUse = supportedToken.toLowerCase() as `0x${string}`;
                    console.log('✓ Setting server token (lowercase):', tokenToUse);
                    setServerToken(tokenToUse);
                } else {
                    console.warn('⚠️ No supported token found in config - calling GetAssets...');
                    // Call GetAssets to discover supported tokens
                    const assetsMsg = createGetAssetsMessageV2(SEPOLIA_CHAIN_ID);
                    webSocketService.send(assetsMsg);
                }
            }

            // Handle GetAssets response - discover supported tokens for channel creation
            if (response.method === RPCMethod.GetAssets) {
                const assets = response.params as any;
                console.log('📦 Supported Assets:', JSON.stringify(assets, null, 2));

                // Find a supported token and use it
                if (assets && Array.isArray(assets) && assets.length > 0) {
                    const firstAsset = assets[0];
                    const tokenAddress = firstAsset.address || firstAsset.token;
                    if (tokenAddress) {
                        console.log('✓ Found supported token from GetAssets:', tokenAddress);
                        setServerToken(tokenAddress as `0x${string}`);
                    }
                }
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

    // ==================== CHAPTER 6: CHANNEL MANAGEMENT ====================

    // Create a new on-chain channel
    const handleCreateChannel = useCallback(async () => {
        if (!sessionKey || !nitroliteClient || !account) {
            alert('Please connect wallet and authenticate first');
            return;
        }

        setIsChannelLoading(true);
        setChannelStatus('creating');

        try {
            const sessionSigner = createECDSAMessageSigner(sessionKey.privateKey);

            // Request channel creation via WebSocket
            // Token must be hex address from GetAssets API
            const createChannelMsg = await createCreateChannelMessage(
                sessionSigner,
                {
                    chain_id: SEPOLIA_CHAIN_ID,
                    token: serverToken, // Hex address: 0xDB9F293e3898c9E5536A3be1b0C56c89d2b32DEb
                }
            );

            console.log('Sending create channel request...');

            // Set up listener for response
            const handleResponse = async (data: unknown) => {
                const response = parseAnyRPCResponse(JSON.stringify(data));

                if (response.method === RPCMethod.CreateChannel) {
                    console.log('Channel creation response:', response);
                    const params = response.params as any;

                    // Response uses camelCase: channelId, serverSignature, state.stateData
                    if (params.channelId || params.channel_id) {
                        const chId = params.channelId || params.channel_id;
                        const serverSig = params.serverSignature || params.server_signature;
                        const state = params.state;
                        const channel = params.channel;

                        console.log('✓ Channel prepared:', chId);

                        // Transform state for on-chain submission
                        const unsignedInitialState = {
                            intent: state.intent,
                            version: BigInt(state.version),
                            data: state.stateData || state.state_data || '0x',
                            allocations: state.allocations.map((a: any) => ({
                                destination: a.destination,
                                token: a.token,
                                amount: BigInt(a.amount),
                            })),
                        };

                        try {
                            console.log('Submitting channel to blockchain...');
                            const createResult = await nitroliteClient.createChannel({
                                channel,
                                unsignedInitialState,
                                serverSignature: serverSig,
                            });

                            const txHash = typeof createResult === 'string' ? createResult : createResult.txHash;
                            console.log('Channel TX submitted:', txHash);

                            // IMPORTANT: Wait for transaction to be mined before allowing resize
                            console.log('⏳ Waiting for transaction confirmation...');
                            const receipt = await publicClient?.waitForTransactionReceipt({
                                hash: txHash as `0x${string}`,
                                confirmations: 1,
                            });
                            console.log('✓ Channel confirmed on-chain! Block:', receipt?.blockNumber);

                            setChannelId(chId);
                            setChannelStatus('open');
                            alert(`Channel created and confirmed! TX: ${txHash.slice(0, 10)}... You can now fund it.`);
                        } catch (chainError) {
                            console.error('On-chain submission failed:', chainError);
                            alert('Failed to submit channel to blockchain. Check console for details.');
                            setChannelStatus('none');
                        }
                    } else if (params.error) {
                        console.error('Channel creation error:', params.error);
                        alert(`Error: ${params.error}`);
                        setChannelStatus('none');
                    }

                    setIsChannelLoading(false);
                    webSocketService.removeMessageListener(handleResponse);
                }
            };

            webSocketService.addMessageListener(handleResponse);
            webSocketService.send(createChannelMsg);
        } catch (error) {
            console.error('Failed to create channel:', error);
            setIsChannelLoading(false);
            setChannelStatus('none');
            alert('Failed to create channel');
        }
    }, [sessionKey, nitroliteClient, account, serverToken]);

    // Fund channel from Unified Balance (resize)
    const handleResizeChannel = useCallback(async (amount: bigint = 20n) => {
        if (!sessionKey || !nitroliteClient || !channelId) {
            alert('Please create a channel first');
            return;
        }

        setIsChannelLoading(true);
        setChannelStatus('funding');

        try {
            const sessionSigner = createECDSAMessageSigner(sessionKey.privateKey);

            const resizeMsg = await createResizeChannelMessage(
                sessionSigner,
                {
                    channel_id: channelId as `0x${string}`,
                    allocate_amount: amount, // From Unified Balance
                    funds_destination: account as Address,
                }
            );

            console.log(`Resizing channel with ${amount} tokens...`);

            const handleResponse = async (data: unknown) => {
                const response = parseAnyRPCResponse(JSON.stringify(data));

                if (response.method === RPCMethod.ResizeChannel) {
                    console.log('Resize response:', response);
                    const params = response.params as any;

                    // Response uses camelCase: channelId, serverSignature, state.stateData
                    const chId = params.channelId || params.channel_id;
                    const serverSig = params.serverSignature || params.server_signature;
                    const state = params.state;

                    if (chId && state) {
                        const resizeState = {
                            intent: state.intent,
                            version: BigInt(state.version),
                            data: state.stateData || state.state_data || '0x',
                            allocations: state.allocations.map((a: any) => ({
                                destination: a.destination,
                                token: a.token,
                                amount: BigInt(a.amount),
                            })),
                            channelId: chId,
                            serverSignature: serverSig,
                        };

                        try {
                            // CRITICAL: Fetch proofStates from on-chain channel data
                            // The contract requires current state as proof for resize
                            console.log('Fetching on-chain channel data for proofs...');
                            let proofStates: any[] = [];
                            try {
                                const onChainData = await nitroliteClient.getChannelData(chId as `0x${string}`);
                                console.log('On-chain channel status:', onChainData.status);
                                if (onChainData.lastValidState) {
                                    proofStates = [onChainData.lastValidState];
                                    console.log('✓ Got proof state from on-chain data');
                                }
                            } catch (e) {
                                console.warn('Could not fetch on-chain data, proceeding without proofs:', e);
                            }

                            console.log('Submitting resize to blockchain...');
                            const { txHash } = await nitroliteClient.resizeChannel({
                                resizeState,
                                proofStates,
                            });
                            console.log('Resize TX submitted:', txHash);

                            // Wait for transaction to be mined (with timeout)
                            console.log('⏳ Waiting for resize confirmation...');
                            try {
                                if (publicClient) {
                                    const receipt = await publicClient.waitForTransactionReceipt({
                                        hash: txHash as `0x${string}`,
                                        confirmations: 1,
                                        timeout: 60_000, // 60 second timeout
                                    });
                                    console.log('✓ Channel resized and confirmed! Block:', receipt?.blockNumber);
                                }
                            } catch (waitError) {
                                console.warn('Receipt wait timed out, but TX was submitted:', waitError);
                            }

                            // Update UI state regardless (TX was submitted successfully)
                            setChannelBalance(amount.toString());
                            setChannelStatus('funded');
                            setIsChannelLoading(false);
                            alert(`Channel funded with ${amount} tokens! TX: ${txHash.slice(0, 10)}...`);
                        } catch (chainError) {
                            console.error('Resize on-chain failed:', chainError);
                            alert('Failed to resize channel on blockchain. Check console.');
                            setChannelStatus('open');
                        }
                    } else if (params.error) {
                        console.error('Resize error:', params.error);
                        alert(`Resize error: ${params.error}`);
                        setChannelStatus('open');
                    }

                    setIsChannelLoading(false);
                    webSocketService.removeMessageListener(handleResponse);
                }
            };

            webSocketService.addMessageListener(handleResponse);
            webSocketService.send(resizeMsg);
        } catch (error) {
            console.error('Failed to resize channel:', error);
            setIsChannelLoading(false);
            setChannelStatus('open');
            alert('Failed to resize channel');
        }
    }, [sessionKey, nitroliteClient, channelId, account]);

    // Close channel and settle on-chain
    const handleCloseChannel = useCallback(async () => {
        if (!sessionKey || !nitroliteClient || !channelId || !account) {
            alert('No channel to close');
            return;
        }

        setIsChannelLoading(true);
        setChannelStatus('closing');

        try {
            const sessionSigner = createECDSAMessageSigner(sessionKey.privateKey);

            const closeMsg = await createCloseChannelMessage(
                sessionSigner,
                channelId as `0x${string}`,
                account
            );

            console.log('Closing channel...');

            const handleResponse = async (data: unknown) => {
                const response = parseAnyRPCResponse(JSON.stringify(data));

                if (response.method === RPCMethod.CloseChannel) {
                    console.log('Close response:', response);
                    const params = response.params as any;

                    // Response uses camelCase: channelId, serverSignature, state.stateData
                    const chId = params.channelId || params.channel_id;
                    const serverSig = params.serverSignature || params.server_signature;
                    const state = params.state;

                    if (chId && state) {
                        const finalState = {
                            intent: state.intent,
                            version: BigInt(state.version),
                            data: state.stateData || state.state_data || '0x',
                            allocations: state.allocations.map((a: any) => ({
                                destination: a.destination,
                                token: a.token,
                                amount: BigInt(a.amount),
                            })),
                            channelId: chId,
                            serverSignature: serverSig,
                        };

                        try {
                            console.log('Submitting close to blockchain...');
                            const txHash = await nitroliteClient.closeChannel({
                                finalState,
                                stateData: state.stateData || state.state_data || '0x',
                            });
                            console.log('Close TX submitted:', txHash);

                            // Wait for transaction to be mined (with timeout)
                            console.log('⏳ Waiting for close confirmation...');
                            try {
                                if (publicClient) {
                                    const receipt = await publicClient.waitForTransactionReceipt({
                                        hash: String(txHash) as `0x${string}`,
                                        confirmations: 1,
                                        timeout: 60_000, // 60 second timeout
                                    });
                                    console.log('✓ Channel closed and confirmed! Block:', receipt?.blockNumber);
                                }
                            } catch (waitError) {
                                console.warn('Receipt wait timed out, but TX was submitted:', waitError);
                            }

                            // Update UI state regardless (TX was submitted successfully)
                            setChannelStatus('closed');
                            setIsChannelLoading(false);
                            alert(`Channel closed! TX: ${String(txHash).slice(0, 10)}... You can now withdraw.`);
                        } catch (chainError) {
                            console.error('Close on-chain failed:', chainError);
                            alert('Failed to close channel on blockchain. Check console.');
                            setChannelStatus('funded');
                        }
                    } else if (params.error) {
                        console.error('Close error:', params.error);
                        alert(`Close error: ${params.error}`);
                        setChannelStatus('funded');
                    }

                    setIsChannelLoading(false);
                    webSocketService.removeMessageListener(handleResponse);
                }
            };

            webSocketService.addMessageListener(handleResponse);
            webSocketService.send(closeMsg);
        } catch (error) {
            console.error('Failed to close channel:', error);
            setIsChannelLoading(false);
            setChannelStatus('funded');
            alert('Failed to close channel');
        }
    }, [sessionKey, nitroliteClient, channelId, account]);

    // Withdraw funds from Custody contract to wallet
    const handleWithdraw = useCallback(async () => {
        if (!nitroliteClient || !publicClient || channelStatus !== 'closed') {
            alert('Please close the channel first');
            return;
        }

        setIsChannelLoading(true);

        try {
            // Poll for withdrawable balance (may take time for close TX to settle)
            let withdrawableBalance = 0n;
            let retries = 0;
            const maxRetries = 10; // 30 seconds max

            console.log('Checking on-chain balance for withdrawal...');

            while (retries < maxRetries) {
                const result = await publicClient.readContract({
                    address: SEPOLIA_CUSTODY_ADDRESS,
                    abi: [{
                        type: 'function',
                        name: 'getAccountsBalances',
                        inputs: [
                            { name: 'users', type: 'address[]' },
                            { name: 'tokens', type: 'address[]' }
                        ],
                        outputs: [{ type: 'uint256[]' }],
                        stateMutability: 'view'
                    }] as const,
                    functionName: 'getAccountsBalances',
                    args: [[account as Address], [YTEST_USD_TOKEN]],
                }) as bigint[];

                withdrawableBalance = result[0];
                console.log(`On-chain custody balance: ${withdrawableBalance} (attempt ${retries + 1}/${maxRetries})`);

                if (withdrawableBalance > 0n) {
                    break;
                }

                // Wait and retry
                console.log('⏳ Waiting for close TX to settle...');
                await new Promise(r => setTimeout(r, 3000));
                retries++;
            }

            if (withdrawableBalance > 0n) {
                console.log(`Withdrawing ${withdrawableBalance} tokens...`);
                const withdrawalTx = await nitroliteClient.withdrawal(YTEST_USD_TOKEN, withdrawableBalance);
                console.log('✓ Funds withdrawn:', withdrawalTx);

                setChannelId(null);
                setChannelStatus('none');
                setChannelBalance('0');
                alert(`Funds withdrawn! TX: ${String(withdrawalTx).slice(0, 10)}...`);
            } else {
                alert('No funds available yet. The close TX may still be pending. Please wait and try again.');
            }
        } catch (error) {
            console.error('Failed to withdraw:', error);
            alert('Failed to withdraw. Close TX may still be pending - please wait a minute and try again.');
        } finally {
            setIsChannelLoading(false);
        }
    }, [nitroliteClient, publicClient, channelStatus, account]);

    // Deposit funds to Unified Balance (ledger)
    // NOTE: On-chain deposits require the actual token contract address (hex)
    const handleDeposit = useCallback(async (amount: bigint = BigInt(10000000000000000)) => { // 0.01 ETH
        if (!nitroliteClient || !account) {
            alert('Please connect wallet first');
            return;
        }

        setIsChannelLoading(true);
        try {
            // For on-chain deposit, we need the actual token contract address
            // YTEST_USD_TOKEN is the ERC-20 contract address on Sepolia
            console.log(`Depositing ${amount} of ytest.usd to Unified Balance...`);
            const txHash = await nitroliteClient.deposit(YTEST_USD_TOKEN, amount);
            console.log('✓ Deposit completed:', txHash);
            alert(`Deposit successful! TX: ${String(txHash).slice(0, 10)}... (Wait a moment for balance update)`);
        } catch (error) {
            console.error('Failed to deposit:', error);
            alert('Failed to deposit funds. Make sure you have approved the token first.');
        } finally {
            setIsChannelLoading(false);
        }
    }, [nitroliteClient, account]);

    // ==================== DEPOSIT / WITHDRAW (Wallet ↔ Ledger) ====================
    const [depositWithdrawAmount, setDepositWithdrawAmount] = useState<string>('100');
    const [isDepositingOrWithdrawing, setIsDepositingOrWithdrawing] = useState(false);

    // Deposit: Wallet (on-chain) → Ledger (off-chain)
    const handleLedgerDeposit = useCallback(async () => {
        if (!nitroliteClient || !account || !publicClient) {
            alert('Please connect wallet first');
            return;
        }
        const raw = parseFloat(depositWithdrawAmount);
        if (isNaN(raw) || raw <= 0) {
            alert('Enter a valid amount');
            return;
        }

        setIsDepositingOrWithdrawing(true);
        try {
            // Get decimals to convert human-readable to raw
            const decimals = await publicClient.readContract({
                address: YTEST_USD_TOKEN,
                abi: [{ name: 'decimals', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint8' }] }],
                functionName: 'decimals',
            }) as number;
            const rawAmount = BigInt(Math.floor(raw * Math.pow(10, Number(decimals))));

            console.log(`Depositing ${raw} ytest.usd (${rawAmount} raw) to Ledger...`);
            const txHash = await nitroliteClient.deposit(YTEST_USD_TOKEN, rawAmount);
            console.log('Deposit TX:', txHash);
            alert(`Deposited ${raw} ytest.usd! TX: ${String(txHash).slice(0, 10)}...`);

            // Refresh wallet balance
            fetchWalletBalance(publicClient, account);
        } catch (error) {
            console.error('Deposit failed:', error);
            alert('Deposit failed. Make sure you have approved the token and have enough balance.');
        } finally {
            setIsDepositingOrWithdrawing(false);
        }
    }, [nitroliteClient, publicClient, account, depositWithdrawAmount, fetchWalletBalance]);

    // Withdraw: Ledger (off-chain) → Wallet (on-chain)
    const handleLedgerWithdraw = useCallback(async () => {
        if (!nitroliteClient || !publicClient || !account) {
            alert('Please connect wallet first');
            return;
        }
        const raw = parseFloat(depositWithdrawAmount);
        if (isNaN(raw) || raw <= 0) {
            alert('Enter a valid amount');
            return;
        }

        setIsDepositingOrWithdrawing(true);
        try {
            const decimals = await publicClient.readContract({
                address: YTEST_USD_TOKEN,
                abi: [{ name: 'decimals', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint8' }] }],
                functionName: 'decimals',
            }) as number;
            const rawAmount = BigInt(Math.floor(raw * Math.pow(10, Number(decimals))));

            console.log(`Withdrawing ${raw} ytest.usd (${rawAmount} raw) from Ledger...`);
            const txHash = await nitroliteClient.withdrawal(YTEST_USD_TOKEN, rawAmount);
            console.log('Withdrawal TX:', txHash);
            alert(`Withdrew ${raw} ytest.usd! TX: ${String(txHash).slice(0, 10)}...`);

            // Refresh wallet balance
            fetchWalletBalance(publicClient, account);
        } catch (error) {
            console.error('Withdrawal failed:', error);
            alert('Withdrawal failed. Check console.');
        } finally {
            setIsDepositingOrWithdrawing(false);
        }
    }, [nitroliteClient, publicClient, account, depositWithdrawAmount, fetchWalletBalance]);

    // Request tokens from sandbox faucet → credits Ledger directly
    const handleFaucet = useCallback(async () => {
        if (!account) {
            alert('Please connect wallet first');
            return;
        }

        setIsDepositingOrWithdrawing(true);
        try {
            const res = await fetch('https://clearnet-sandbox.yellow.com/faucet/requestTokens', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userAddress: account }),
            });
            const data = await res.json();
            if (data.success) {
                alert(`Faucet: +${data.amount} ${data.asset} credited to your ledger!`);
            } else {
                alert(`Faucet failed: ${data.message || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Faucet request failed:', error);
            alert('Faucet request failed. Check console.');
        } finally {
            setIsDepositingOrWithdrawing(false);
        }
    }, [account]);

    // ==================== CHAPTER 7: APP SESSION (INSTANT PAYMENTS) ====================
    // Create an App Session for instant off-chain payments (no blockchain TX needed!)
    const handleCreateAppSession = useCallback(async () => {
        if (!sessionKey || !account) {
            alert('Please authenticate first');
            return;
        }
        if (!appSessionPartner || !appSessionPartner.startsWith('0x')) {
            alert('Please enter a valid partner address (0x...)');
            return;
        }

        setIsAppSessionLoading(true);
        setAppSessionStatus('creating');

        try {
            const messageSigner = createECDSAMessageSigner(sessionKey.privateKey);

            // Define the app session - a 2-party payment channel
            const appDefinition = {
                application: APP_NAME,
                protocol: RPCProtocolVersion.NitroRPC_0_4,
                participants: [account, appSessionPartner] as `0x${string}`[],
                weights: [100, 0], // Only creator needs to sign
                quorum: 100, // Creator's weight meets quorum alone
                challenge: 0, // No challenge period for instant finality
                nonce: Date.now(),
            };

            // Initial allocations - split from your ledger balance
            const allocations = [
                { participant: account, asset: 'ytest.usd', amount: '100' },
                { participant: appSessionPartner as Address, asset: 'ytest.usd', amount: '0' },
            ];

            const handleResponse = async (data: unknown) => {
                const response = parseAnyRPCResponse(JSON.stringify(data));
                console.log('App Session response:', response);

                if (response.method === RPCMethod.CreateAppSession) {
                    const params = response.params as any;

                    if (params.appSessionId || params.app_session_id) {
                        const sessionId = params.appSessionId || params.app_session_id;
                        console.log('✓ App Session created:', sessionId);
                        setAppSessionId(sessionId);
                        setAppSessionStatus('active');
                        setAppSessionVersion(1);
                        setPayerBalance('100');
                        setPayeeBalance('0');
                        alert(`App Session created! ID: ${sessionId.slice(0, 10)}...`);
                    } else if (params.error) {
                        console.error('App Session error:', params.error);
                        alert(`Failed to create App Session: ${params.error}`);
                        setAppSessionStatus('none');
                    }

                    setIsAppSessionLoading(false);
                    webSocketService.removeMessageListener(handleResponse);
                }
            };

            webSocketService.addMessageListener(handleResponse);

            console.log('Creating App Session with:', { appDefinition, allocations });
            const appSessionMsg = await createAppSessionMessage(messageSigner, {
                definition: appDefinition,
                allocations,
            });
            webSocketService.send(appSessionMsg);

        } catch (error) {
            console.error('Failed to create App Session:', error);
            alert('Failed to create App Session. Check console.');
            setAppSessionStatus('none');
            setIsAppSessionLoading(false);
        }
    }, [sessionKey, account, appSessionPartner]);

    // Send instant payment within the App Session using submit_app_state (NO blockchain TX!)
    const handleInstantPayment = useCallback(async (amount: string = '10') => {
        if (!sessionKey || !appSessionId || !account) {
            alert('Please create an App Session first');
            return;
        }

        try {
            const messageSigner = createECDSAMessageSigner(sessionKey.privateKey);

            // Calculate new FINAL allocations (not delta)
            const newPayerBalance = (parseFloat(payerBalance) - parseFloat(amount)).toString();
            const newPayeeBalance = (parseFloat(payeeBalance) + parseFloat(amount)).toString();
            const nextVersion = appSessionVersion + 1;

            // submit_app_state with intent: operate (redistribute within session)
            const submitMsg = await createSubmitAppStateMessage<typeof RPCProtocolVersion.NitroRPC_0_4>(messageSigner, {
                app_session_id: appSessionId as `0x${string}`,
                intent: RPCAppStateIntent.Operate,
                version: nextVersion,
                allocations: [
                    { participant: account, asset: 'ytest.usd', amount: newPayerBalance },
                    { participant: appSessionPartner as Address, asset: 'ytest.usd', amount: newPayeeBalance },
                ],
            });

            console.log('Sending app state update:', amount, 'ytest.usd, version:', nextVersion);
            webSocketService.send(submitMsg);

            // Update local state
            setPayerBalance(newPayerBalance);
            setPayeeBalance(newPayeeBalance);
            setAppSessionVersion(nextVersion);

            alert(`Sent ${amount} ytest.usd instantly! (No gas fees)`);

        } catch (error) {
            console.error('Failed to send payment:', error);
            alert('Payment failed. Check console.');
        }
    }, [sessionKey, appSessionId, appSessionPartner, account, payerBalance, payeeBalance, appSessionVersion]);

    // Close the App Session
    const handleCloseAppSession = useCallback(async () => {
        if (!sessionKey || !appSessionId || !account) {
            alert('No active App Session');
            return;
        }

        setIsAppSessionLoading(true);
        setAppSessionStatus('closing');

        try {
            const messageSigner = createECDSAMessageSigner(sessionKey.privateKey);

            const handleResponse = async (data: unknown) => {
                const response = parseAnyRPCResponse(JSON.stringify(data));
                console.log('Close App Session response:', response);

                if (response.method === RPCMethod.CloseAppSession) {
                    const params = response.params as any;

                    if (params.success || !params.error) {
                        console.log('✓ App Session closed');
                        setAppSessionId(null);
                        setAppSessionStatus('closed');
                        setAppSessionVersion(1);
                        setPayerBalance('0');
                        setPayeeBalance('0');
                        setAppSessionPartner('');
                        alert('App Session closed! Funds returned to ledger.');
                    } else if (params.error) {
                        console.error('Close error:', params.error);
                        alert(`Failed to close: ${params.error}`);
                        setAppSessionStatus('active');
                    }

                    setIsAppSessionLoading(false);
                    webSocketService.removeMessageListener(handleResponse);
                }
            };

            webSocketService.addMessageListener(handleResponse);

            // Final allocations when closing - use current balances (sum must equal session total)
            const closeMsg = await createCloseAppSessionMessage(messageSigner, {
                app_session_id: appSessionId as `0x${string}`,
                allocations: [
                    { participant: account, asset: 'ytest.usd', amount: payerBalance },
                    { participant: appSessionPartner as Address, asset: 'ytest.usd', amount: payeeBalance },
                ],
            });
            webSocketService.send(closeMsg);

        } catch (error) {
            console.error('Failed to close App Session:', error);
            alert('Failed to close App Session. Check console.');
            setAppSessionStatus('active');
            setIsAppSessionLoading(false);
        }
    }, [sessionKey, appSessionId, account, appSessionPartner, payerBalance, payeeBalance]);

    // Refresh / recover app sessions from ClearNode
    const handleRefreshAppSessions = useCallback(async () => {
        if (!account) {
            alert('Please connect wallet first');
            return;
        }

        try {
            const getSessionsMsg = createGetAppSessionsMessageV2(account);

            const handleResponse = async (data: unknown) => {
                const response = parseAnyRPCResponse(JSON.stringify(data));
                console.log('App Sessions response:', response);

                if (response.method === RPCMethod.GetAppSessions) {
                    const params = response.params as any;
                    const sessions = params.appSessions || params.app_sessions || [];

                    if (sessions.length > 0) {
                        // Find the latest open session
                        const openSession = sessions.find((s: any) => s.status === 'open');
                        if (openSession) {
                            const sid = openSession.appSessionId || openSession.app_session_id;
                            setAppSessionId(sid);
                            setAppSessionStatus('active');
                            setAppSessionVersion(openSession.version || 1);

                            // Restore allocations if available
                            if (openSession.allocations) {
                                const myAlloc = openSession.allocations.find((a: any) => a.participant?.toLowerCase() === account.toLowerCase());
                                const partnerAlloc = openSession.allocations.find((a: any) => a.participant?.toLowerCase() !== account.toLowerCase());
                                if (myAlloc) setPayerBalance(myAlloc.amount || '0');
                                if (partnerAlloc) {
                                    setPayeeBalance(partnerAlloc.amount || '0');
                                    setAppSessionPartner(partnerAlloc.participant || '');
                                }
                            }

                            alert(`Recovered session: ${sid.slice(0, 10)}...`);
                        } else {
                            alert(`Found ${sessions.length} session(s), but none are open.`);
                        }
                    } else {
                        alert('No app sessions found.');
                    }

                    webSocketService.removeMessageListener(handleResponse);
                }
            };

            webSocketService.addMessageListener(handleResponse);
            webSocketService.send(getSessionsMsg);
        } catch (error) {
            console.error('Failed to refresh app sessions:', error);
            alert('Failed to refresh. Check console.');
        }
    }, [account]);

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
                        Connect your wallet and sign once with EIP-712 to authenticate. After that, all App Session
                        operations (create, send, close) use your session key automatically — no more MetaMask popups!
                        Use the &quot;Support&quot; buttons to send instant, gasless transfers.
                    </p>
                </div>

                {/* Wallet & Ledger Balances with Deposit/Withdraw */}
                {account && (
                    <div className="mb-6 p-4 rounded-xl bg-zinc-900 border border-zinc-700">
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <div className="text-xs text-zinc-500 uppercase tracking-wide font-bold mb-1">Wallet (On-Chain)</div>
                                <div className="text-xl font-bold text-white">{walletBalance} <span className="text-sm text-zinc-500">ytest.usd</span></div>
                                <div className="text-[10px] text-zinc-600">ERC-20 on Sepolia</div>
                            </div>
                            <div>
                                <div className="text-xs text-zinc-500 uppercase tracking-wide font-bold mb-1">Ledger (Off-Chain)</div>
                                <div className="text-xl font-bold text-yellow-400">{balances?.['ytest.usd'] ?? '—'} <span className="text-sm text-zinc-500">ytest.usd</span></div>
                                <div className="text-[10px] text-zinc-600">Unified balance on ClearNode</div>
                            </div>
                        </div>

                        {/* Faucet - Sandbox only */}
                        <div className="flex items-center gap-3 mb-3">
                            <button
                                onClick={handleFaucet}
                                disabled={isDepositingOrWithdrawing}
                                className="px-4 py-2 rounded-lg font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-yellow-500 hover:bg-yellow-400 text-black"
                            >
                                {isDepositingOrWithdrawing ? '...' : 'Request Faucet Tokens'}
                            </button>
                            <span className="text-xs text-zinc-500">Credits 10M ytest.usd directly to your ledger (sandbox only)</span>
                        </div>

                        {/* On-chain Deposit/Withdraw (requires ERC-20 tokens in wallet) */}
                        <details className="group">
                            <summary className="cursor-pointer text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
                                On-chain Deposit/Withdraw (production flow)
                            </summary>
                            <div className="flex items-center gap-3 mt-2">
                                <input
                                    type="number"
                                    value={depositWithdrawAmount}
                                    onChange={(e) => setDepositWithdrawAmount(e.target.value)}
                                    placeholder="Amount"
                                    className="w-32 px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-lg text-sm font-mono"
                                />
                                <span className="text-xs text-zinc-500">ytest.usd</span>
                                <button
                                    onClick={handleLedgerDeposit}
                                    disabled={isDepositingOrWithdrawing || !nitroliteClient}
                                    className="px-4 py-2 rounded-lg font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-green-600 hover:bg-green-500 text-white"
                                >
                                    {isDepositingOrWithdrawing ? '...' : 'Deposit →'}
                                </button>
                                <button
                                    onClick={handleLedgerWithdraw}
                                    disabled={isDepositingOrWithdrawing || !nitroliteClient}
                                    className="px-4 py-2 rounded-lg font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-red-600 hover:bg-red-500 text-white"
                                >
                                    {isDepositingOrWithdrawing ? '...' : '← Withdraw'}
                                </button>
                            </div>
                            <div className="text-[10px] text-zinc-600 mt-1">Requires ERC-20 ytest.usd tokens in your wallet. Deposit: wallet → custody → ledger. Withdraw: ledger → custody → wallet.</div>
                        </details>
                    </div>
                )}

                {/* App Session Payments - EIP-712 Sign Once, Then All Automatic */}
                {isAuthenticated && (
                    <div className="mb-8 p-6 rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <span className="text-purple-400">⚡</span> App Session Payments
                        </h2>

                        <div className="mb-4 p-3 rounded-lg bg-zinc-900/50 text-sm text-zinc-400">
                            <strong className="text-green-400">Signed once with EIP-712</strong> during authentication.
                            All operations below use your <strong className="text-white">session key automatically</strong> —
                            no MetaMask popups, no gas fees, instant off-chain payments!
                        </div>

                        {/* App Session Status */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                            <div className="p-4 rounded-lg bg-zinc-900/50 border border-zinc-700">
                                <div className="text-sm text-zinc-400 mb-1">Session Status</div>
                                <div className={`font-semibold ${appSessionStatus === 'active' ? 'text-green-400' :
                                    appSessionStatus === 'creating' ? 'text-yellow-400' :
                                        appSessionStatus === 'none' ? 'text-zinc-500' : 'text-orange-400'
                                    }`}>
                                    {appSessionStatus === 'none' ? 'No Session' :
                                        appSessionStatus === 'creating' ? 'Creating...' :
                                            appSessionStatus === 'active' ? 'Active' :
                                                appSessionStatus === 'closing' ? 'Closing...' : 'Closed'}
                                </div>
                            </div>

                            <div className="p-4 rounded-lg bg-zinc-900/50 border border-zinc-700">
                                <div className="text-sm text-zinc-400 mb-1">Session ID</div>
                                <div className="font-mono text-sm truncate">
                                    {appSessionId ? `${appSessionId.slice(0, 10)}...${appSessionId.slice(-8)}` : '—'}
                                </div>
                            </div>

                            <div className="p-4 rounded-lg bg-zinc-900/50 border border-purple-500/30">
                                <div className="text-sm text-zinc-400 mb-1">Payer (You)</div>
                                <div className="font-semibold text-purple-400">{payerBalance} <span className="text-xs text-zinc-500">ytest.usd</span></div>
                            </div>

                            <div className="p-4 rounded-lg bg-zinc-900/50 border border-pink-500/30">
                                <div className="text-sm text-zinc-400 mb-1">Payee{appSessionPartner ? ` (${appSessionPartner.slice(0, 6)}...)` : ''}</div>
                                <div className="font-semibold text-pink-400">{payeeBalance} <span className="text-xs text-zinc-500">ytest.usd</span></div>
                            </div>
                        </div>

                        {/* Partner Address Input */}
                        {appSessionStatus === 'none' && (
                            <div className="mb-6">
                                <label className="block text-xs text-zinc-500 mb-2 uppercase tracking-wide font-bold">
                                    Partner Address (who you want to pay)
                                </label>
                                <input
                                    type="text"
                                    value={appSessionPartner}
                                    onChange={(e) => setAppSessionPartner(e.target.value)}
                                    placeholder="0x... (partner wallet address)"
                                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-600 rounded-lg font-mono text-sm"
                                />
                            </div>
                        )}

                        {/* Action Buttons - All use session key (no MetaMask!) */}
                        <div className="flex flex-wrap gap-3">
                            <button
                                onClick={handleCreateAppSession}
                                disabled={isAppSessionLoading || appSessionStatus !== 'none'}
                                className="px-4 py-2 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-purple-500 hover:bg-purple-400 text-black shadow-lg shadow-purple-500/20"
                            >
                                {appSessionStatus === 'creating' ? 'Creating...' : '1. Create Session'}
                            </button>

                            <button
                                onClick={() => handleInstantPayment('10')}
                                disabled={isAppSessionLoading || appSessionStatus !== 'active'}
                                className="px-4 py-2 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-pink-500 hover:bg-pink-400 text-black shadow-lg shadow-pink-500/20"
                            >
                                2. Send 10 yUSD (Instant!)
                            </button>

                            <button
                                onClick={handleCloseAppSession}
                                disabled={isAppSessionLoading || appSessionStatus !== 'active'}
                                className="px-4 py-2 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-orange-500 hover:bg-orange-400 text-black shadow-lg shadow-orange-500/20"
                            >
                                {appSessionStatus === 'closing' ? 'Closing...' : '3. Close Session'}
                            </button>

                            <button
                                onClick={handleRefreshAppSessions}
                                disabled={!isAuthenticated}
                                className="px-4 py-2 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-zinc-700 hover:bg-zinc-600 text-white"
                            >
                                Refresh Sessions
                            </button>
                        </div>

                        <div className="mt-4 text-xs text-zinc-500">
                            All steps above use your EIP-712 authorized session key — no additional wallet signatures needed!
                            Version: {appSessionVersion}
                        </div>
                    </div>
                )}

                {/* On-Chain Channel Management (Advanced - requires gas) */}
                {isAuthenticated && (
                    <details className="mb-8 group">
                    <summary className="cursor-pointer list-none p-4 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-white transition-colors font-semibold flex items-center justify-between">
                        <span>Advanced: On-Chain Channel Management</span>
                        <span className="text-xs text-zinc-600 group-open:hidden">Click to expand</span>
                    </summary>
                    <div className="mt-2 p-6 rounded-xl bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <span className="text-yellow-400">🔗</span> State Channel Management
                        </h2>

                        {/* Channel Status */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            <div className="p-4 rounded-lg bg-zinc-900/50 border border-zinc-700">
                                <div className="text-sm text-zinc-400 mb-1">Status</div>
                                <div className={`font-semibold ${channelStatus === 'funded' ? 'text-green-400' :
                                    channelStatus === 'open' ? 'text-yellow-400' :
                                        channelStatus === 'closed' ? 'text-blue-400' :
                                            channelStatus === 'none' ? 'text-zinc-500' : 'text-orange-400'
                                    }`}>
                                    {channelStatus === 'none' ? 'No Channel' :
                                        channelStatus === 'creating' ? 'Creating...' :
                                            channelStatus === 'open' ? 'Open (Not Funded)' :
                                                channelStatus === 'funding' ? 'Funding...' :
                                                    channelStatus === 'funded' ? 'Funded ✓' :
                                                        channelStatus === 'closing' ? 'Closing...' : 'Closed'}
                                </div>
                            </div>

                            <div className="p-4 rounded-lg bg-zinc-900/50 border border-zinc-700">
                                <div className="text-sm text-zinc-400 mb-1">Channel ID</div>
                                <div className="font-mono text-sm truncate">
                                    {channelId ? `${channelId.slice(0, 10)}...${channelId.slice(-8)}` : '—'}
                                </div>
                                {/* Manual channel ID entry for recovering lost channels */}
                                {!channelId && (
                                    <div className="mt-2">
                                        <input
                                            type="text"
                                            placeholder="Paste existing channel ID (0x...)"
                                            className="w-full px-2 py-1 text-xs font-mono bg-zinc-800 border border-zinc-600 rounded"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    const input = e.currentTarget.value.trim();
                                                    if (input.startsWith('0x') && input.length === 66) {
                                                        setChannelId(input);
                                                        setChannelStatus('funded');
                                                        setIsChannelLoading(false); // Reset loading state
                                                        alert('Channel ID restored! You can now close it.');
                                                    } else {
                                                        alert('Invalid channel ID. Must be 0x + 64 hex chars.');
                                                    }
                                                }
                                            }}
                                        />
                                        <div className="text-xs text-zinc-500 mt-1">Press Enter to restore</div>
                                    </div>
                                )}
                            </div>

                            <div className="p-4 rounded-lg bg-zinc-900/50 border border-zinc-700">
                                <div className="text-sm text-zinc-400 mb-1">Channel Balance</div>
                                <div className="font-semibold">{channelBalance} ytest.usd</div>
                            </div>
                        </div>

                        {/* Deposit ytest.usd */}
                        <div className="mb-6 p-4 rounded-lg bg-zinc-900/30 border border-zinc-800">
                            <label className="block text-xs text-zinc-500 mb-2 uppercase tracking-wide font-bold">Step 0: Fund Ledger (ytest.usd)</label>
                            <button
                                onClick={() => handleDeposit(BigInt(10000000000000000))}
                                disabled={isChannelLoading}
                                className="w-full px-4 py-1.5 rounded-md text-sm font-bold bg-zinc-100 hover:bg-white text-black transition-all disabled:opacity-50"
                            >
                                {isChannelLoading ? 'Processing...' : 'Deposit 0.01 ytest.usd'}
                            </button>
                            <p className="text-[10px] text-zinc-500 mt-1">Moves funds from Wallet → Unified Balance</p>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap gap-3">
                            <button
                                onClick={handleCreateChannel}
                                disabled={isChannelLoading || channelStatus !== 'none'}
                                className="px-4 py-2 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-yellow-500 hover:bg-yellow-400 text-black shadow-lg shadow-yellow-500/20"
                            >
                                {channelStatus === 'creating' ? 'Creating...' : '1. Create Channel'}
                            </button>

                            <button
                                onClick={() => handleResizeChannel(BigInt(20))}
                                disabled={isChannelLoading || channelStatus !== 'open'}
                                className="px-4 py-2 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-green-500 hover:bg-green-400 text-black shadow-lg shadow-green-500/20"
                            >
                                {channelStatus === 'funding' ? 'Funding...' : '2. Fund (20 units)'}
                            </button>

                            <button
                                onClick={handleCloseChannel}
                                disabled={isChannelLoading || (channelStatus !== 'open' && channelStatus !== 'funded')}
                                className="px-4 py-2 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-orange-500 hover:bg-orange-400 text-black shadow-lg shadow-orange-500/20"
                            >
                                {channelStatus === 'closing' ? 'Closing...' : '3. Close Channel'}
                            </button>

                            <button
                                onClick={handleWithdraw}
                                disabled={isChannelLoading || channelStatus !== 'closed'}
                                className="px-4 py-2 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-blue-500 hover:bg-blue-400 text-black shadow-lg shadow-blue-500/20"
                            >
                                4. Withdraw to Wallet
                            </button>
                        </div>

                        {/* Info */}
                        <div className="mt-4 text-xs text-zinc-500">
                            On-chain channel operations require Sepolia ETH for gas. View your channel on{' '}
                            <a href="https://apps.yellow.com" target="_blank" rel="noopener noreferrer" className="text-yellow-400 hover:underline">
                                apps.yellow.com
                            </a>
                        </div>
                    </div>
                    </details>
                )}
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
