import { useState, useEffect, useCallback, useRef } from 'react';
import { createAppSessionMessage, parseAnyRPCResponse } from '@erc7824/nitrolite';
import { ethers } from 'ethers';

// Base Sepolia Chain Configuration
const BASE_SEPOLIA_CONFIG = {
    chainId: '0x14a34', // 84532 in hex
    chainName: 'Base Sepolia',
    nativeCurrency: {
        name: 'ETH',
        symbol: 'ETH',
        decimals: 18,
    },
    rpcUrls: ['https://sepolia.base.org'],
    blockExplorerUrls: ['https://sepolia.basescan.org'],
};

// Types
interface ConnectionStatus {
    connected: boolean;
    connecting: boolean;
    error: string | null;
}

interface WalletState {
    connected: boolean;
    address: string | null;
    connecting: boolean;
    chainId: string | null;
    isCorrectChain: boolean;
}

interface Message {
    id: number;
    type: 'connection' | 'sent' | 'received' | 'wallet' | 'error' | 'info';
    content: string;
    timestamp: Date;
}

interface Session {
    id: string | null;
    partner: string | null;
    active: boolean;
    version: number;
    allocations: any[];
}

interface AuthState {
    status: 'unauthenticated' | 'requesting' | 'challenging' | 'verifying' | 'authenticated';
    sessionWallet: any | null; // Avoid specific ethers class mismatch
    jwt: string | null;
    error: string | null;
}

export default function YellowNetworkPage() {
    // WebSocket reference
    const wsRef = useRef<WebSocket | null>(null);
    const messageIdRef = useRef(0);

    // Connection state
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
        connected: false,
        connecting: false,
        error: null,
    });

    // Wallet state
    const [wallet, setWallet] = useState<WalletState>({
        connected: false,
        address: null,
        connecting: false,
        chainId: null,
        isCorrectChain: false,
    });

    // Session state
    const [session, setSession] = useState<Session>({
        id: null,
        partner: null,
        active: false,
        version: 0,
        allocations: []
    });

    // Auth / Session Key state
    const [auth, setAuth] = useState<AuthState>({
        status: 'unauthenticated',
        sessionWallet: null,
        jwt: null,
        error: null,
    });

    // UI state
    const [messages, setMessages] = useState<Message[]>([]);
    const [partnerAddress, setPartnerAddress] = useState('');
    const [paymentAmount, setPaymentAmount] = useState('0.1');

    // Ref for pending auth params (needed for EIP-712 in step 3)
    const pendingAuthRef = useRef<any>(null);
    const sessionWalletRef = useRef<any>(null);

    // Add message to log
    const addMessage = useCallback((type: Message['type'], content: string) => {
        const id = ++messageIdRef.current;
        setMessages(prev => [...prev.slice(-29), { id, type, content, timestamp: new Date() }]);
    }, []);

    // Switch to Base Sepolia network
    const switchToBaseSepolia = async () => {
        if (!window.ethereum) return;

        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: BASE_SEPOLIA_CONFIG.chainId }],
            });
        } catch (switchError: unknown) {
            // Chain not added, try to add it
            if ((switchError as { code: number }).code === 4902) {
                try {
                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [BASE_SEPOLIA_CONFIG],
                    });
                } catch (addError) {
                    console.error('Failed to add Base Sepolia:', addError);
                    addMessage('error', 'Failed to add Base Sepolia network');
                }
            }
        }
    };

    // Connect wallet
    const connectWallet = async () => {
        if (!window.ethereum) {
            addMessage('error', 'MetaMask not detected');
            return;
        }

        setWallet(prev => ({ ...prev, connecting: true }));
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);

            // Try to get accounts first (defensive check)
            let accounts: string[] = await provider.send('eth_accounts', []);

            // If no accounts, explicitly request them
            if (accounts.length === 0) {
                try {
                    // Try eth_requestAccounts first
                    accounts = await provider.send('eth_requestAccounts', []);
                } catch (reqErr: any) {
                    // If it fails with -32603, try forcing permission popup
                    if (reqErr.code === -32603 || reqErr.message?.includes('No active wallet')) {
                        addMessage('info', '🔄 Attempting fallback: Requesting permissions...');
                        try {
                            await provider.send('wallet_requestPermissions', [{ eth_accounts: {} }]);
                            accounts = await provider.send('eth_requestAccounts', []);
                        } catch (permErr: any) {
                            throw new Error('MetaMask is stuck. Please manually lock and unlock MetaMask (extension settings > lock) then try again.');
                        }
                    } else {
                        throw reqErr;
                    }
                }
            }

            if (accounts.length === 0) {
                throw new Error('No accounts authorized');
            }

            const signer = await provider.getSigner();
            const address = await signer.getAddress();
            const network = await provider.getNetwork();
            const chainId = '0x' + network.chainId.toString(16);

            const isCorrectChain = chainId === BASE_SEPOLIA_CONFIG.chainId;

            setWallet({
                connected: true,
                address,
                connecting: false,
                chainId,
                isCorrectChain,
            });

            addMessage('wallet', `✅ Connected: ${address.slice(0, 6)}...${address.slice(-4)}`);

            if (!isCorrectChain) {
                setTimeout(switchToBaseSepolia, 500);
            }
        } catch (err: any) {
            console.error('Wallet connection failed:', err);
            setWallet(prev => ({ ...prev, connecting: false }));

            const msg = err.message || 'Check MetaMask status';
            addMessage('error', `Connection failed: ${msg}`);

            if (msg.includes('-32603') || msg.includes('stuck')) {
                addMessage('info', '� MetaMask appears to be in a broken state. Click the MetaMask icon -> Three dots -> Lock. Then unlock and try again.');
            }
        }
    };









    // Listen for wallet changes
    useEffect(() => {
        if (typeof window === 'undefined' || !window.ethereum) return;

        const handleAccountsChanged = (...args: unknown[]) => {
            const accounts = args[0] as string[];
            if (!accounts || accounts.length === 0) {
                setWallet({ connected: false, address: null, connecting: false, chainId: null, isCorrectChain: false });
                addMessage('wallet', 'Wallet disconnected');
            } else {
                setWallet(prev => ({ ...prev, address: accounts[0] }));
                addMessage('wallet', `Account changed: ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`);
            }
        };

        const handleChainChanged = (...args: unknown[]) => {
            const chainId = args[0] as string;
            const isCorrectChain = chainId === BASE_SEPOLIA_CONFIG.chainId;
            setWallet(prev => ({ ...prev, chainId, isCorrectChain }));
            addMessage('info', `Chain changed to ${chainId === BASE_SEPOLIA_CONFIG.chainId ? 'Base Sepolia' : 'Unknown'}`);
        };

        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('chainChanged', handleChainChanged);

        return () => {
            window.ethereum?.removeListener?.('accountsChanged', handleAccountsChanged);
            window.ethereum?.removeListener?.('chainChanged', handleChainChanged);
        };
    }, [addMessage]);

    // Connect to Yellow Network ClearNode
    const connectToClearNode = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            addMessage('info', 'Already connected to ClearNode');
            return;
        }

        setConnectionStatus({ connected: false, connecting: true, error: null });
        addMessage('connection', 'Connecting to Yellow Network (Sandbox)...');

        try {
            const ws = new WebSocket('wss://clearnet-sandbox.yellow.com/ws');
            wsRef.current = ws;

            ws.onopen = () => {
                console.log('✅ Connected to Yellow Network!');
                setConnectionStatus({ connected: true, connecting: false, error: null });
                addMessage('connection', '🟢 Connected to ClearNode (wss://clearnet-sandbox.yellow.com/ws)');
            };

            ws.onmessage = (event) => {
                try {
                    const message = parseAnyRPCResponse(event.data);
                    console.log('📨 Received:', message);
                    addMessage('received', JSON.stringify(message, null, 2));
                    // Call the latest handler (using its dependency chain)
                    handleClearNodeMessageRef.current(message);
                } catch {
                    // Raw message (not JSON-RPC)
                    console.log('Raw message:', event.data);
                    addMessage('received', String(event.data));
                }
            };

            ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                setConnectionStatus({ connected: false, connecting: false, error: 'Connection error' });
                addMessage('error', 'WebSocket connection error');
            };

            ws.onclose = (event) => {
                console.log('Connection closed:', event.code, event.reason);
                setConnectionStatus({ connected: false, connecting: false, error: null });
                addMessage('connection', `🔴 Disconnected (code: ${event.code})`);
                setSession({ id: null, partner: null, active: false, version: 0, allocations: [] });
            };
        } catch (err) {
            console.error('Failed to connect:', err);
            setConnectionStatus({ connected: false, connecting: false, error: 'Failed to connect' });
            addMessage('error', 'Failed to establish WebSocket connection');
        }
    }, [addMessage]);

    // Disconnect from ClearNode
    const disconnectFromClearNode = useCallback(() => {
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
    }, []);

    // Create a ref for the message handler to avoid socket closures on state changes
    const handleClearNodeMessageRef = useRef<any>(null);

    // Handle messages from ClearNode
    const handleClearNodeMessage = useCallback(async (message: unknown) => {
        console.log('📨 Full Raw Message:', message);

        // Yellow Network Response Format: { res: [id, method, data, timestamp], sig: [...] }
        const res = (message as any).res;
        const msg = (message as any);

        let msgType = '';
        let result: any = null;
        let error: string | null = null;

        if (Array.isArray(res)) {
            // [id, method, data, timestamp]
            const [id, method, data, timestamp] = res;
            msgType = method;
            result = data;

            // If method is 'error', the data contains the error string
            if (method === 'error') {
                error = data.error || JSON.stringify(data);
            }
        } else {
            // Support standard JSON-RPC or simplified method/params root structure
            msgType = msg.method || msg.type || '';
            result = msg.params || msg.result || msg;
            error = msg.error || (result ? result.error : null);
        }

        switch (msgType) {
            case 'challenge':
            case 'auth_challenge':
                // Support both snake_case (docs) and camelCase (observed)
                const challenge = result.challenge_message || result.challengeMessage || result;
                if (challenge && typeof challenge === 'string') {
                    addMessage('info', `🔑 Challenge received: ${challenge.slice(0, 8)}...`);
                    console.log('Challenge Message identified:', challenge);
                    // Force a small delay to ensure MetaMask is ready and state is settled
                    setTimeout(() => verifySession(challenge), 100);
                } else {
                    console.error('No challenge message found in:', result);
                    addMessage('error', 'Auth challenge missing message payload');
                }
                break;
            case 'auth_verify':
            case 'auth_verify_result':
            case 'result':
                const jwt = result.jwt_token || result.jwtToken;
                if (result && jwt) {
                    setAuth(prev => ({
                        ...prev,
                        status: 'authenticated',
                        jwt: jwt
                    }));
                    addMessage('info', '✅ Session Key authenticated! Payments are now instant.');
                }
                break;
            case 'create_app_session':
            case 'app_session_created':
            case 'session_created':
                const sessionData = Array.isArray(result) ? result[0] : result;
                const sessionId = sessionData.app_session_id || sessionData.sessionId;
                if (sessionId) {
                    setSession(prev => ({
                        ...prev,
                        id: sessionId,
                        active: true,
                        version: sessionData.version || 1,
                        allocations: sessionData.allocations || prev.allocations
                    }));
                    addMessage('info', `✅ Session created: ${sessionId.slice(0, 10)}...`);
                }
                break;
            case 'submit_app_state':
            case 'app_state_submitted':
                if (result) {
                    setSession(prev => ({
                        ...prev,
                        version: result.version || prev.version,
                        allocations: result.allocations || prev.allocations
                    }));
                    addMessage('info', `💸 Payment confirmed (v${result.version})`);
                }
                break;
            case 'payment':
                addMessage('info', `💰 Payment received: ${result.amount}`);
                break;
            case 'get_ledger_balances':
            case 'ledger_balances':
            case 'balances':
                const balances = result.balances || result;
                if (Array.isArray(balances)) {
                    const ytestBalance = balances.find((b: any) => b.asset === 'ytest.usd');
                    if (ytestBalance) {
                        addMessage('info', `💰 Ledger Balance: ${ytestBalance.amount} ytest.usd`);
                    } else {
                        addMessage('info', `💰 Ledger Balances: ${balances.map((b: any) => `${b.amount} ${b.asset}`).join(', ')}`);
                    }
                }
                break;
            case 'error':
                addMessage('error', `❌ ClearNode error: ${error}`);
                setAuth(prev => ({ ...prev, status: 'unauthenticated', error: error }));
                break;
            default:
                if (msgType) {
                    console.log(`Unhandled message type: ${msgType}`, result);
                }
        }
    }, [addMessage]);

    // Keep ref updated
    useEffect(() => {
        handleClearNodeMessageRef.current = handleClearNodeMessage;
    }, [handleClearNodeMessage]);

    // Step 1: Request Authentication
    const requestSessionAuth = async () => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
            addMessage('error', 'Not connected to ClearNode');
            return;
        }

        if (!wallet.address) {
            addMessage('error', 'Please connect wallet first');
            return;
        }

        try {
            setAuth(prev => ({ ...prev, status: 'requesting', error: null }));
            addMessage('info', 'Generating local session key...');

            // Generate temporary local wallet
            let sessionWallet = sessionWalletRef.current;
            if (!sessionWallet) {
                sessionWallet = ethers.Wallet.createRandom();
                sessionWalletRef.current = sessionWallet;
                setAuth(prev => ({ ...prev, sessionWallet }));
            }
            // Use SECONDS for expires_at (10-digit) as seen in EIP-712 examples
            const expires_at = Math.floor(Date.now() / 1000) + 3600;

            const authParams = {
                address: wallet.address,
                session_key: sessionWallet.address,
                application: 'yellow-payment-demo',
                // MUST match symbols in the 'assets' message (ytest.usd)
                allowances: [{ asset: 'ytest.usd', amount: '100000000000' }],
                expires_at: expires_at,
                scope: 'console' // Standard scope from docs
            };

            console.log('Sending auth_request with params:', authParams);

            pendingAuthRef.current = authParams;
            sessionWalletRef.current = sessionWallet;
            setAuth(prev => ({ ...prev, sessionWallet }));

            // Yellow Network Envelope: { req: [id, method, params, timestamp] }
            const request = {
                req: [
                    ++messageIdRef.current,
                    'auth_request',
                    authParams,
                    Date.now()
                ]
            };

            wsRef.current.send(JSON.stringify(request));
            addMessage('sent', 'Auth request sent (Yellow Envelope)...');
        } catch (err: any) {
            addMessage('error', `Auth failed: ${err.message}`);
            setAuth(prev => ({ ...prev, status: 'unauthenticated' }));
        }
    };

    // Step 3: Verify (Sign Challenge)
    const verifySession = async (challenge: string) => {
        console.log('🚀 verifySession called with challenge:', challenge);
        console.log('pendingAuthRef:', pendingAuthRef.current);
        console.log('sessionWalletRef:', sessionWalletRef.current?.address);

        if (!window.ethereum || !pendingAuthRef.current || !sessionWalletRef.current) {
            console.error('Missing dependencies for verifySession:', {
                ethereum: !!window.ethereum,
                pendingAuth: !!pendingAuthRef.current,
                sessionWallet: !!sessionWalletRef.current
            });
            addMessage('error', 'Internal state missing for verification. Try connecting again.');
            return;
        }

        try {
            setAuth(prev => ({ ...prev, status: 'verifying' }));
            addMessage('info', 'Please sign the session delegation in MetaMask...');

            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();

            const domain = {
                name: pendingAuthRef.current.application
            };

            const types = {
                Policy: [
                    { name: "challenge", type: "string" },
                    { name: "scope", type: "string" },
                    { name: "wallet", type: "address" },
                    { name: "session_key", type: "address" },
                    { name: "expires_at", type: "uint64" },
                    { name: "allowances", type: "Allowance[]" }
                ],
                Allowance: [
                    { name: "asset", type: "string" },
                    { name: "amount", type: "string" }
                ]
            };

            const message = {
                challenge: challenge,
                scope: pendingAuthRef.current.scope,
                wallet: pendingAuthRef.current.address,
                session_key: pendingAuthRef.current.session_key,
                expires_at: pendingAuthRef.current.expires_at,
                allowances: pendingAuthRef.current.allowances
            };

            addMessage('info', 'Please sign the session delegation in MetaMask...');
            const signature = await signer.signTypedData(domain, types, message);

            // Yellow Network Envelope: { req: [id, method, params, timestamp], sig: [...] }
            // Auth methods typically use object-based params, not arrays
            const verifyRequest = {
                req: [
                    ++messageIdRef.current,
                    'auth_verify',
                    { challenge },
                    Date.now()
                ],
                sig: [signature] // The EIP-712 signature from the main wallet
            };

            wsRef.current?.send(JSON.stringify(verifyRequest));
            addMessage('sent', 'Auth verification sent...');
        } catch (err: any) {
            addMessage('error', `Verification failed: ${err.message}`);
            setAuth(prev => ({ ...prev, status: 'unauthenticated' }));
        }
    };

    // Create message signer - prioritizing session key
    const createMessageSigner = useCallback(() => {
        if (!wallet.address) return null;

        // If we have an authenticated session key, use it for instant signing
        if (auth.status === 'authenticated' && auth.sessionWallet) {
            return async (payload: unknown): Promise<`0x${string}`> => {
                const message = typeof payload === 'string' ? payload : JSON.stringify(payload);

                // Yellow Network Requirement: Raw signing (NO Ethereum prefix)
                // This ensures compatibility with both EVM and non-EVM chains.
                const digest = ethers.id(message);
                const signature = auth.sessionWallet.signingKey.sign(digest).serialized;

                return signature as `0x${string}`;
            };
        }

        // Fallback to MetaMask if not authenticated
        if (typeof window === 'undefined' || !window.ethereum) return null;

        return async (payload: unknown): Promise<`0x${string}`> => {
            const provider = new ethers.BrowserProvider(window.ethereum!);
            const signer = await provider.getSigner();
            const message = typeof payload === 'string' ? payload : JSON.stringify(payload);
            const signature = await signer.signMessage(message) as string;
            return signature as `0x${string}`;
        };
    }, [wallet.address, auth.status, auth.sessionWallet]);

    // Check ledger balance
    const checkBalance = async () => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
            addMessage('error', 'Not connected to ClearNode');
            return;
        }

        const messageSigner = createMessageSigner();
        if (!messageSigner || !wallet.address) {
            addMessage('error', 'Please connect your wallet first');
            return;
        }

        try {
            addMessage('sent', 'Checking ledger balances...');

            const request = {
                req: [
                    ++messageIdRef.current,
                    'get_ledger_balances',
                    [{ participant: wallet.address }],
                    Date.now()
                ]
            };

            // Sign the ENTIRE ENVELOPE (ClearNode Sandbox protocol requirement)
            const signature = await messageSigner(request);
            (request as any).sig = [signature];

            wsRef.current.send(JSON.stringify(request));
        } catch (err) {
            console.error('Failed to check balance:', err);
            addMessage('error', `Balance check failed: ${err}`);
        }
    };

    // Create payment session
    const createSession = async () => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
            addMessage('error', 'Not connected to ClearNode');
            return;
        }

        if (!partnerAddress || !partnerAddress.startsWith('0x')) {
            addMessage('error', 'Please enter a valid partner address');
            return;
        }

        const messageSigner = createMessageSigner();
        if (!messageSigner || !wallet.address) {
            addMessage('error', 'Please connect your wallet first');
            return;
        }

        try {
            addMessage('sent', 'Creating payment session...');

            // If partner is self, use a mock address to avoid protocol conflicts 
            // where the same address needs two distinct signatures/slots
            const isSolo = partnerAddress.toLowerCase() === wallet.address?.toLowerCase();
            const finalPartner = isSolo ? '0x1111111111111111111111111111111111111111' : partnerAddress;

            if (isSolo) {
                addMessage('info', 'Solo test detected: Using mock partner address for demo.');
            }

            const appDefinition = {
                application: 'yellow-payment-demo',
                protocol: 'NitroRPC/0.4',
                participants: [wallet.address as `0x${string}`, finalPartner as `0x${string}`],
                weights: [100, 0],
                quorum: 100,
                challenge: 0,
                nonce: Date.now(),
            };

            const allocations = [
                { participant: wallet.address as `0x${string}`, asset: 'ytest.usd', amount: '1.0' },
                { participant: finalPartner as `0x${string}`, asset: 'ytest.usd', amount: '0.0' },
            ];

            const request = {
                req: [
                    ++messageIdRef.current,
                    'create_app_session',
                    [{
                        definition: appDefinition,
                        allocations: allocations
                    }],
                    Date.now()
                ]
            };

            // ALL data messages must be signed at the envelope level
            const ms = createMessageSigner();
            if (ms) {
                const signature = await ms(request);
                (request as any).sig = [signature];
            }

            wsRef.current.send(JSON.stringify(request));
            setSession(prev => ({ ...prev, partner: finalPartner }));
            addMessage('sent', `Session request sent to: ${finalPartner.slice(0, 8)}...`);
        } catch (err) {
            console.error('Failed to create session:', err);
            addMessage('error', `Session creation failed: ${err}`);
        }
    };

    // Send payment
    const sendPayment = async () => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
            addMessage('error', 'Not connected to ClearNode');
            return;
        }

        const messageSigner = createMessageSigner();
        if (!messageSigner || !wallet.address) {
            addMessage('error', 'Please connect your wallet first');
            return;
        }

        const recipient = session.partner || partnerAddress;
        if (!recipient) {
            addMessage('error', 'No recipient address specified');
            return;
        }

        try {
            if (!session.id) {
                addMessage('error', 'No active session. Create a session first.');
                return;
            }

            // Convert allocations to new state for 'operate' intent
            // Current: Alice = 8 USDC, Bob = 2 USDC. Payment = 1 USDC.
            // New: Alice = 7 USDC, Bob = 3 USDC.

            const nextVersion = (session.version || 1) + 1;
            const payAmount = parseFloat(paymentAmount); // Use as float per protocol docs

            const newAllocations = session.allocations.map(alloc => {
                const currentVal = parseFloat(alloc.amount);
                if (alloc.participant.toLowerCase() === wallet.address?.toLowerCase()) {
                    return { ...alloc, amount: (currentVal - payAmount).toFixed(6).replace(/\.?0+$/, "") };
                }
                if (alloc.participant.toLowerCase() === recipient.toLowerCase()) {
                    return { ...alloc, amount: (currentVal + payAmount).toFixed(6).replace(/\.?0+$/, "") };
                }
                return alloc;
            });

            const submitRequest = {
                req: [
                    ++messageIdRef.current,
                    'submit_app_state',
                    [{
                        app_session_id: session.id,
                        intent: 'operate',
                        version: nextVersion,
                        allocations: newAllocations
                    }],
                    Date.now()
                ]
            };

            // Sign the ENTIRE ENVELOPE
            const signature = await messageSigner(submitRequest);
            (submitRequest as any).sig = [signature];

            wsRef.current.send(JSON.stringify(submitRequest));
            addMessage('sent', `💸 Sending ${paymentAmount} units to ${recipient.slice(0, 8)}... (v${nextVersion})`);
        } catch (err) {
            console.error('Failed to send payment:', err);
            addMessage('error', `Payment failed: ${err}`);
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-yellow-900/20 to-slate-900 text-white">
            {/* Header */}
            <header className="border-b border-white/10 bg-black/30 backdrop-blur-sm">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center font-bold text-black text-lg">
                            Y
                        </div>
                        <div>
                            <h1 className="text-xl font-bold">Yellow Network</h1>
                            <p className="text-xs text-white/60">State Channel Demo on Base Sepolia</p>
                        </div>
                    </div>

                    {/* Status Indicators */}
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <div className={`w-2.5 h-2.5 rounded-full ${wallet.connected && wallet.isCorrectChain ? 'bg-green-400' :
                                wallet.connected ? 'bg-yellow-400' : 'bg-gray-500'
                                }`} />
                            <span className="text-sm text-white/70">
                                {wallet.connected
                                    ? wallet.isCorrectChain
                                        ? `${wallet.address?.slice(0, 6)}...${wallet.address?.slice(-4)}`
                                        : 'Wrong Network'
                                    : 'Wallet'
                                }
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className={`w-2.5 h-2.5 rounded-full ${connectionStatus.connected ? 'bg-green-400 animate-pulse' :
                                connectionStatus.connecting ? 'bg-yellow-400 animate-pulse' : 'bg-gray-500'
                                }`} />
                            <span className="text-sm text-white/70">
                                {connectionStatus.connected ? 'ClearNode' :
                                    connectionStatus.connecting ? 'Connecting...' : 'Disconnected'}
                            </span>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-6 py-8">
                {/* Title Section */}
                <div className="text-center mb-10">
                    <h2 className="text-4xl font-bold mb-3 bg-gradient-to-r from-yellow-400 via-orange-400 to-yellow-500 bg-clip-text text-transparent">
                        State Channel Payment App
                    </h2>
                    <p className="text-white/60 max-w-2xl mx-auto">
                        Connect your wallet, establish a state channel session, and send instant gasless payments
                        through Yellow Network on Base Sepolia testnet.
                    </p>
                </div>

                <div className="grid lg:grid-cols-2 gap-6">
                    {/* Left Column - Controls */}
                    <div className="space-y-6">
                        {/* Step 1: Connect Wallet */}
                        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center text-black font-bold text-sm">
                                    1
                                </div>
                                <h3 className="text-lg font-semibold">Connect Wallet</h3>
                            </div>

                            {!wallet.connected ? (
                                <button
                                    onClick={connectWallet}
                                    disabled={wallet.connecting}
                                    className="w-full py-3 px-4 bg-gradient-to-r from-orange-500 to-pink-500 rounded-xl font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                                >
                                    {wallet.connecting ? '⏳ Connecting...' : '🦊 Connect MetaMask'}
                                </button>
                            ) : !wallet.isCorrectChain ? (
                                <div className="space-y-3">
                                    <div className="p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/30 text-yellow-400 text-sm">
                                        ⚠️ Please switch to Base Sepolia network
                                    </div>
                                    <button
                                        onClick={switchToBaseSepolia}
                                        className="w-full py-3 px-4 bg-yellow-500 rounded-xl font-semibold text-black hover:bg-yellow-400 transition-colors"
                                    >
                                        Switch to Base Sepolia
                                    </button>
                                </div>
                            ) : (
                                <div className="p-4 bg-green-500/10 rounded-xl border border-green-500/30">
                                    <div className="flex items-center gap-3">
                                        <span className="text-green-400 text-xl">✓</span>
                                        <div>
                                            <p className="font-semibold text-green-400">Connected to Base Sepolia</p>
                                            <p className="text-sm text-white/60 font-mono">
                                                {wallet.address}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Step 2: Connect to ClearNode */}
                        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center text-black font-bold text-sm">
                                    2
                                </div>
                                <h3 className="text-lg font-semibold">Connect to ClearNode</h3>
                            </div>

                            {!connectionStatus.connected ? (
                                <button
                                    onClick={connectToClearNode}
                                    disabled={connectionStatus.connecting}
                                    className="w-full py-3 px-4 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl font-semibold text-black hover:opacity-90 transition-opacity disabled:opacity-50"
                                >
                                    {connectionStatus.connecting ? '⏳ Connecting...' : '🌐 Connect to Sandbox'}
                                </button>
                            ) : (
                                <div className="space-y-3">
                                    <div className="p-4 bg-green-500/10 rounded-xl border border-green-500/30">
                                        <div className="flex items-center gap-3">
                                            <span className="text-green-400 animate-pulse">●</span>
                                            <div>
                                                <p className="font-semibold text-green-400">Connected</p>
                                                <p className="text-xs text-white/60 font-mono">
                                                    wss://clearnet-sandbox.yellow.com/ws
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={disconnectFromClearNode}
                                        className="w-full py-2 px-4 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors text-sm"
                                    >
                                        Disconnect
                                    </button>
                                    <button
                                        onClick={checkBalance}
                                        className="w-full py-2 px-4 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors text-sm"
                                    >
                                        Check Balances
                                    </button>
                                </div>
                            )}

                            {connectionStatus.error && (
                                <div className="mt-3 p-3 bg-red-500/10 rounded-lg border border-red-500/20 text-red-400 text-sm">
                                    {connectionStatus.error}
                                </div>
                            )}

                            {/* Session Key Delegation UI */}
                            {connectionStatus.connected && wallet.connected && (
                                <div className="mt-4 pt-4 border-t border-white/5">
                                    <h4 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">
                                        Optimization: Session Keys
                                    </h4>

                                    {auth.status === 'authenticated' ? (
                                        <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/30 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="text-blue-400 text-lg">⚡</span>
                                                <span className="text-sm font-medium text-blue-400">One-Click Mode Active</span>
                                            </div>
                                            <span className="text-[10px] text-white/40 font-mono">
                                                {auth.sessionWallet?.address.slice(0, 6)}...
                                            </span>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <p className="text-[10px] text-white/40 leading-relaxed">
                                                Avoid repeated MetaMask popups by delegating authority to a local temporary key for 1 hour.
                                            </p>
                                            <button
                                                onClick={requestSessionAuth}
                                                disabled={auth.status !== 'unauthenticated'}
                                                className="w-full py-2 px-3 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2"
                                            >
                                                {auth.status === 'unauthenticated' ? '🔑 Enable One-Click Payments' : '⏳ Authenticating...'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Step 3: Create Session */}
                        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center text-black font-bold text-sm">
                                    3
                                </div>
                                <h3 className="text-lg font-semibold">Create Payment Session</h3>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm text-white/60 mb-2">Partner Address</label>
                                    <input
                                        type="text"
                                        value={partnerAddress}
                                        onChange={(e) => setPartnerAddress(e.target.value)}
                                        placeholder="0x..."
                                        className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-yellow-400/50 font-mono text-sm"
                                    />
                                </div>

                                <button
                                    onClick={createSession}
                                    disabled={!connectionStatus.connected || !wallet.connected || !wallet.isCorrectChain}
                                    className="w-full py-3 px-4 bg-purple-500 rounded-xl font-semibold text-white hover:bg-purple-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    📝 Create Session
                                </button>

                                {session.active && (
                                    <div className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/30 text-purple-400 text-sm">
                                        ✓ Session active with {session.partner?.slice(0, 8)}...
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Step 4: Send Payment */}
                        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center text-black font-bold text-sm">
                                    4
                                </div>
                                <h3 className="text-lg font-semibold">Send Instant Payment</h3>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm text-white/60 mb-2">Amount (USDC units, 6 decimals)</label>
                                    <input
                                        type="text"
                                        value={paymentAmount}
                                        onChange={(e) => setPaymentAmount(e.target.value)}
                                        placeholder="100000"
                                        className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-yellow-400/50 font-mono"
                                    />
                                    <p className="text-xs text-white/40 mt-1">
                                        100000 = 0.1 USDC | 1000000 = 1 USDC
                                    </p>
                                </div>

                                <button
                                    onClick={sendPayment}
                                    disabled={!connectionStatus.connected || !wallet.connected || !wallet.isCorrectChain}
                                    className="w-full py-3 px-4 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl font-semibold text-black hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    💸 Send Payment
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Message Log */}
                    <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 flex flex-col">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            📜 Message Log
                            <span className="text-xs text-white/40 font-normal">
                                ({messages.length} messages)
                            </span>
                        </h3>

                        <div className="flex-1 bg-black/50 rounded-xl p-4 font-mono text-sm overflow-y-auto min-h-[500px] max-h-[600px]">
                            {messages.length === 0 ? (
                                <div className="text-white/30 text-center py-12">
                                    <p className="text-2xl mb-2">📡</p>
                                    <p>Connect to ClearNode to see messages...</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {messages.map((msg) => (
                                        <div
                                            key={msg.id}
                                            className={`flex gap-2 text-xs ${msg.type === 'error' ? 'text-red-400' :
                                                msg.type === 'sent' ? 'text-blue-400' :
                                                    msg.type === 'received' ? 'text-green-400' :
                                                        msg.type === 'wallet' ? 'text-orange-400' :
                                                            msg.type === 'connection' ? 'text-purple-400' :
                                                                'text-white/60'
                                                }`}
                                        >
                                            <span className="text-white/30 shrink-0">
                                                [{msg.timestamp.toLocaleTimeString()}]
                                            </span>
                                            <span className={`uppercase text-[10px] px-1.5 py-0.5 rounded shrink-0 ${msg.type === 'error' ? 'bg-red-500/20' :
                                                msg.type === 'sent' ? 'bg-blue-500/20' :
                                                    msg.type === 'received' ? 'bg-green-500/20' :
                                                        msg.type === 'wallet' ? 'bg-orange-500/20' :
                                                            msg.type === 'connection' ? 'bg-purple-500/20' :
                                                                'bg-white/10'
                                                }`}>
                                                {msg.type}
                                            </span>
                                            <span className="break-all whitespace-pre-wrap">
                                                {msg.content}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <button
                            onClick={() => setMessages([])}
                            className="mt-4 py-2 px-4 bg-white/5 text-white/60 rounded-lg hover:bg-white/10 transition-colors text-sm"
                        >
                            Clear Log
                        </button>
                    </div>
                </div>

                {/* Info Section */}
                <div className="mt-10 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-2xl p-8 border border-yellow-500/20">
                    <h3 className="text-2xl font-bold mb-6 text-center">How It Works</h3>
                    <div className="grid md:grid-cols-4 gap-6">
                        <div className="text-center">
                            <div className="text-3xl mb-3">🔐</div>
                            <h4 className="font-semibold mb-2">Open Channel</h4>
                            <p className="text-sm text-white/60">
                                Lock funds in a state channel smart contract (1 on-chain tx)
                            </p>
                        </div>
                        <div className="text-center">
                            <div className="text-3xl mb-3">✍️</div>
                            <h4 className="font-semibold mb-2">Sign States</h4>
                            <p className="text-sm text-white/60">
                                Exchange signed state updates off-chain through ClearNode
                            </p>
                        </div>
                        <div className="text-center">
                            <div className="text-3xl mb-3">⚡</div>
                            <h4 className="font-semibold mb-2">Instant Payments</h4>
                            <p className="text-sm text-white/60">
                                Send unlimited payments with zero gas fees instantly
                            </p>
                        </div>
                        <div className="text-center">
                            <div className="text-3xl mb-3">🔒</div>
                            <h4 className="font-semibold mb-2">Close & Settle</h4>
                            <p className="text-sm text-white/60">
                                Submit final state to settle on-chain (1 on-chain tx)
                            </p>
                        </div>
                    </div>
                </div>

                {/* Code Preview */}
                <div className="mt-8 bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                    <h3 className="text-lg font-semibold mb-4">💻 SDK Usage</h3>
                    <pre className="bg-black/50 rounded-xl p-4 overflow-x-auto text-sm">
                        <code className="text-green-400">{`import { createAppSessionMessage, parseRPCResponse } from '@erc7824/nitrolite';

// Connect to Yellow Network ClearNode (Base Sepolia)
const ws = new WebSocket('wss://clearnet-sandbox.yellow.com/ws');

// Create session with signed message
const sessionMessage = await createAppSessionMessage(
  messageSigner, // Your wallet's signing function
  [{ definition: appDefinition, allocations }]
);

ws.send(sessionMessage);`}</code>
                    </pre>
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-white/10 mt-12">
                <div className="max-w-6xl mx-auto px-6 py-6 text-center text-white/40 text-sm">
                    <p>
                        Built with Yellow Network SDK (@erc7824/nitrolite) |
                        <a href="https://docs.yellow.org" className="text-yellow-400 hover:underline ml-1" target="_blank" rel="noopener noreferrer">
                            docs.yellow.org
                        </a>
                    </p>
                    <p className="mt-2">Network: Base Sepolia (Chain ID: 84532)</p>
                </div>
            </footer>
        </div>
    );
}

// TypeScript declarations for window.ethereum
declare global {
    interface Window {
        ethereum?: {
            request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
            on: (event: string, handler: (...args: unknown[]) => void) => void;
            removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
        };
    }
}
