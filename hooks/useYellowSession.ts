/**
 * Reusable hook for Yellow Network session management.
 * Extracted from yellow.tsx — handles WebSocket, auth, app sessions,
 * instant payments, deposit/withdraw.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
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
    createAppSessionMessage,
    createCloseAppSessionMessage,
    createSubmitAppStateMessage,
    parseAnyRPCResponse,
    RPCMethod,
    NitroliteClient,
    WalletStateSigner,
    RPCProtocolVersion,
    RPCAppStateIntent,
    type AuthChallengeResponse,
    type GetLedgerBalancesResponse,
    type BalanceUpdateResponse,
    type AuthRequestParams,
} from '@erc7824/nitrolite';

// ==================== CONSTANTS ====================
const SEPOLIA_CUSTODY_ADDRESS = '0x019B65A265EB3363822f2752141b3dF16131b262' as const;
const SEPOLIA_ADJUDICATOR_ADDRESS = '0x7c7ccbc98469190849BCC6c926307794fDfB11F2' as const;
const YTEST_USD_TOKEN = '0xDB9F293e3898c9E5536A3be1b0C56c89d2b32DEb' as const;
const SEPOLIA_CHAIN_ID = 11155111;
const SESSION_DURATION = 3600;
const AUTH_SCOPE = 'yellow-workshop.app';
const APP_NAME = 'Yellow Workshop';
const CLOB_SERVER_URL = 'http://localhost:3001';

const getAuthDomain = () => ({ name: APP_NAME });

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
    } catch { return null; }
};

const storeSessionKey = (sk: SessionKey) => {
    try { localStorage.setItem(SESSION_KEY_STORAGE, JSON.stringify(sk)); } catch {}
};
const removeSessionKey = () => {
    try { localStorage.removeItem(SESSION_KEY_STORAGE); } catch {}
};
const storeJWT = (token: string) => {
    try { localStorage.setItem(JWT_KEY, token); } catch {}
};
const removeJWT = () => {
    try { localStorage.removeItem(JWT_KEY); } catch {}
};
const getStoredJWT = (): string | null => {
    try { return typeof window === 'undefined' ? null : localStorage.getItem(JWT_KEY); } catch { return null; }
};

// ==================== WEBSOCKET SERVICE ====================
type WsStatus = 'Connecting' | 'Connected' | 'Disconnected';
type MessageListener = (data: unknown) => void;

class WebSocketService {
    private socket: WebSocket | null = null;
    private status: WsStatus = 'Disconnected';
    private statusListeners: Set<(s: WsStatus) => void> = new Set();
    private messageListeners: Set<MessageListener> = new Set();
    private messageQueue: string[] = [];

    public connect() {
        if (this.socket && this.socket.readyState < 2) return;
        const wsUrl = process.env.NEXT_PUBLIC_NITROLITE_WS_URL || 'wss://clearnet-sandbox.yellow.com/ws';
        this.updateStatus('Connecting');
        this.socket = new WebSocket(wsUrl);
        this.socket.onopen = () => {
            this.updateStatus('Connected');
            this.messageQueue.forEach((msg) => this.socket?.send(msg));
            this.messageQueue = [];
        };
        this.socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.messageListeners.forEach((l) => l(data));
            } catch {}
        };
        this.socket.onclose = () => this.updateStatus('Disconnected');
        this.socket.onerror = () => this.updateStatus('Disconnected');
    }

    public send(payload: string) {
        if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(payload);
        else this.messageQueue.push(payload);
    }

    private updateStatus(s: WsStatus) {
        this.status = s;
        this.statusListeners.forEach((l) => l(s));
    }

    public addStatusListener(l: (s: WsStatus) => void) { this.statusListeners.add(l); l(this.status); }
    public removeStatusListener(l: (s: WsStatus) => void) { this.statusListeners.delete(l); }
    public addMessageListener(l: MessageListener) { this.messageListeners.add(l); }
    public removeMessageListener(l: MessageListener) { this.messageListeners.delete(l); }
}

const webSocketService = new WebSocketService();

// ==================== CLOB UTILITIES ====================
interface CLOBInfo {
    address: Address;
    sessionKey: Address;
    authenticated: boolean;
}

async function fetchCLOBInfo(): Promise<CLOBInfo | null> {
    try {
        const r = await fetch(`${CLOB_SERVER_URL}/clob-address`);
        if (!r.ok) return null;
        return await r.json();
    } catch { return null; }
}

async function getCLOBSignature(message: any): Promise<string | null> {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const r = await fetch(`${CLOB_SERVER_URL}/api/sign`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'sign-create-session', message }),
            signal: controller.signal,
        });
        clearTimeout(timeout);
        if (!r.ok) {
            const errBody = await r.text();
            console.error('[getCLOBSignature] Server error:', r.status, errBody);
            return null;
        }
        const data = await r.json();
        return data.signature ?? null;
    } catch (err: any) {
        if (err.name === 'AbortError') {
            console.error('[getCLOBSignature] Request timed out (8s)');
        } else {
            console.error('[getCLOBSignature] Fetch error:', err);
        }
        return null;
    }
}

// ==================== HOOK ====================
export function useYellowSession() {
    // Wallet
    const [account, setAccount] = useState<Address | null>(null);
    const [walletClient, setWalletClient] = useState<WalletClient | null>(null);
    const [publicClient, setPublicClient] = useState<PublicClient | null>(null);
    const [nitroliteClient, setNitroliteClient] = useState<NitroliteClient | null>(null);

    // WebSocket
    const [wsStatus, setWsStatus] = useState<WsStatus>('Disconnected');

    // Auth
    const [sessionKey, setSessionKey] = useState<SessionKey | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isAuthAttempted, setIsAuthAttempted] = useState(false);
    const [sessionExpireTimestamp, setSessionExpireTimestamp] = useState('');

    // Ledger balances
    const [balances, setBalances] = useState<Record<string, string> | null>(null);

    // CLOB
    const [clobInfo, setClobInfo] = useState<CLOBInfo | null>(null);

    // App Session
    const [appSessionId, setAppSessionId] = useState<string | null>(null);
    const [appSessionStatus, setAppSessionStatus] = useState<'none' | 'creating' | 'active' | 'closing' | 'closed'>('none');
    const [appSessionVersion, setAppSessionVersion] = useState(1);
    const [payerBalance, setPayerBalance] = useState('0');
    const [payeeBalance, setPayeeBalance] = useState('0');
    const [isSessionLoading, setIsSessionLoading] = useState(false);

    // Server token
    const [serverToken, setServerToken] = useState<`0x${string}`>(YTEST_USD_TOKEN);

    // Ref for beforeunload — needs sync access to latest session values
    const unloadDataRef = useRef({
        sessionKeyPrivate: null as string | null,
        appSessionId: null as string | null,
        payerBalance: '0',
        payeeBalance: '0',
        appSessionVersion: 1,
        account: null as Address | null,
        appSessionStatus: 'none' as string,
    });

    // ==================== CONNECT WALLET ====================
    const connectWallet = useCallback(async () => {
        if (typeof window === 'undefined' || !window.ethereum) {
            alert('Please install MetaMask!');
            return;
        }
        try {
            const chainId = await window.ethereum.request({ method: 'eth_chainId' });
            if (chainId !== '0xaa36a7') {
                try {
                    await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0xaa36a7' }] });
                } catch (e: any) {
                    if (e.code === 4902) {
                        await window.ethereum.request({
                            method: 'wallet_addEthereumChain',
                            params: [{ chainId: '0xaa36a7', chainName: 'Sepolia', nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 }, rpcUrls: ['https://sepolia.drpc.org'], blockExplorerUrls: ['https://sepolia.etherscan.io'] }],
                        });
                    } else throw e;
                }
            }
            const tempClient = createWalletClient({ chain: sepolia, transport: custom(window.ethereum) });
            const [address] = await tempClient.requestAddresses();
            const client = createWalletClient({ account: address, chain: sepolia, transport: custom(window.ethereum) });
            const pubClient = createPublicClient({ chain: sepolia, transport: http('https://1rpc.io/sepolia') });
            const nitroClient = new NitroliteClient({
                publicClient: pubClient, walletClient: client,
                stateSigner: new WalletStateSigner(client),
                addresses: { custody: SEPOLIA_CUSTODY_ADDRESS, adjudicator: SEPOLIA_ADJUDICATOR_ADDRESS },
                chainId: sepolia.id, challengeDuration: BigInt(3600),
            });
            setWalletClient(client); setPublicClient(pubClient); setNitroliteClient(nitroClient); setAccount(address);
        } catch (error) {
            console.error('Failed to connect wallet:', error);
            alert('Failed to connect wallet.');
        }
    }, []);

    // ==================== WEBSOCKET + SESSION KEY INIT ====================
    useEffect(() => {
        const existing = getStoredSessionKey();
        if (existing) { setSessionKey(existing); }
        else { const sk = generateSessionKey(); storeSessionKey(sk); setSessionKey(sk); }
        webSocketService.addStatusListener(setWsStatus);
        webSocketService.connect();
        return () => { webSocketService.removeStatusListener(setWsStatus); };
    }, []);

    // ==================== CLOB INFO (keep polling to track reconnections) ====================
    useEffect(() => {
        let cancelled = false;
        const check = async () => {
            if (cancelled) return;
            const info = await fetchCLOBInfo();
            if (cancelled) return;
            setClobInfo(info);
        };
        check();
        const interval = setInterval(check, 5000);
        return () => { cancelled = true; clearInterval(interval); };
    }, []);

    // ==================== SYNC UNLOAD REF + BEFOREUNLOAD HANDLER ====================
    useEffect(() => {
        unloadDataRef.current = {
            sessionKeyPrivate: sessionKey?.privateKey ?? null,
            appSessionId,
            payerBalance,
            payeeBalance,
            appSessionVersion,
            account,
            appSessionStatus,
        };
    }, [sessionKey, appSessionId, payerBalance, payeeBalance, appSessionVersion, account, appSessionStatus]);

    useEffect(() => {
        const handleBeforeUnload = () => {
            const d = unloadDataRef.current;
            if (d.appSessionStatus !== 'active' || !d.appSessionId || !d.sessionKeyPrivate || !d.account) return;

            const payload = {
                userSessionKeyPrivate: d.sessionKeyPrivate,
                appSessionId: d.appSessionId,
                payerBalance: d.payerBalance,
                payeeBalance: d.payeeBalance,
                appSessionVersion: d.appSessionVersion,
                userAddress: d.account,
            };

            const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
            navigator.sendBeacon(`${CLOB_SERVER_URL}/api/close-yellow-session`, blob);
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, []);

    // ==================== AUTO-AUTH ====================
    useEffect(() => {
        if (account && sessionKey && wsStatus === 'Connected' && !isAuthenticated && !isAuthAttempted) {
            setIsAuthAttempted(true);
            const jwt = getStoredJWT();
            if (jwt) {
                createAuthVerifyMessageWithJWT(jwt).then((p) => webSocketService.send(p)).catch(() => { removeJWT(); setIsAuthAttempted(false); });
                return;
            }
            const expire = String(Math.floor(Date.now() / 1000) + SESSION_DURATION);
            setSessionExpireTimestamp(expire);
            const authParams: AuthRequestParams = {
                address: account, session_key: sessionKey.address,
                expires_at: BigInt(Math.floor(Date.now() / 1000) + SESSION_DURATION),
                scope: AUTH_SCOPE, application: APP_NAME,
                allowances: [{ asset: 'ytest.usd', amount: '999999999999999' }],
            };
            createAuthRequestMessage(authParams).then((p) => webSocketService.send(p));
        }
    }, [account, sessionKey, wsStatus, isAuthenticated, isAuthAttempted]);

    // ==================== FETCH BALANCES ====================
    useEffect(() => {
        if (isAuthenticated && sessionKey && account) {
            const signer = createECDSAMessageSigner(sessionKey.privateKey);
            createGetLedgerBalancesMessage(signer, account).then((p) => webSocketService.send(p));
        }
    }, [isAuthenticated, sessionKey, account]);

    // ==================== MESSAGE HANDLER ====================
    useEffect(() => {
        const handler = async (data: unknown) => {
            const response = parseAnyRPCResponse(JSON.stringify(data));

            // Auth challenge
            if (response.method === RPCMethod.AuthChallenge && walletClient && sessionKey && account && sessionExpireTimestamp) {
                const challengeResponse = response as AuthChallengeResponse;
                const authParams = {
                    scope: AUTH_SCOPE, application: APP_NAME, participant: sessionKey.address,
                    session_key: sessionKey.address, expires_at: BigInt(sessionExpireTimestamp),
                    allowances: [{ asset: 'ytest.usd', amount: '999999999999999' }],
                };
                try {
                    const signer = createEIP712AuthMessageSigner(walletClient, authParams, getAuthDomain());
                    const payload = await createAuthVerifyMessage(signer, challengeResponse);
                    webSocketService.send(payload);
                } catch { setIsAuthAttempted(false); }
            }

            // Auth success
            if (response.method === RPCMethod.AuthVerify && response.params?.success) {
                setIsAuthenticated(true);
                if (response.params.jwtToken) storeJWT(response.params.jwtToken);
                // Fetch config + assets
                if (sessionKey) {
                    const signer = createECDSAMessageSigner(sessionKey.privateKey);
                    createGetConfigMessage(signer).then((p) => webSocketService.send(p)).catch(() => {});
                }
            }

            // Config → token discovery
            if (response.method === RPCMethod.GetConfig) {
                const config = response.params as any;
                let token = config?.supported_tokens?.[SEPOLIA_CHAIN_ID]?.[0];
                if (!token && config?.networks) {
                    const net = config.networks.find((n: any) => n.chainId === SEPOLIA_CHAIN_ID);
                    token = net?.tokens?.[0] || net?.assets?.[0]?.address;
                }
                if (token) setServerToken(token.toLowerCase() as `0x${string}`);
                else webSocketService.send(createGetAssetsMessageV2(SEPOLIA_CHAIN_ID));
            }

            if (response.method === RPCMethod.GetAssets) {
                const assets = response.params as any;
                if (assets?.[0]) {
                    const addr = assets[0].address || assets[0].token;
                    if (addr) setServerToken(addr as `0x${string}`);
                }
            }

            // Balances
            if (response.method === RPCMethod.GetLedgerBalances) {
                const br = response as GetLedgerBalancesResponse;
                if (br.params.ledgerBalances?.length) {
                    setBalances(Object.fromEntries(br.params.ledgerBalances.map((b) => [b.asset, b.amount])));
                } else { setBalances({}); }
            }

            if (response.method === RPCMethod.BalanceUpdate) {
                const bu = response as BalanceUpdateResponse;
                setBalances(Object.fromEntries(bu.params.balanceUpdates.map((b) => [b.asset, b.amount])));
            }

            // Errors
            if (response.method === RPCMethod.Error) {
                const msg = (response.params as any)?.error || 'Unknown error';
                console.error('[YellowSession] RPC Error:', msg);
                if (msg.includes('auth') || msg.includes('expired') || msg.includes('jwt')) {
                    console.log('[YellowSession] Auth error — clearing JWT and re-authenticating...');
                    removeJWT();
                    setIsAuthenticated(false);
                    setIsAuthAttempted(false);
                }
                if (msg.includes('missing signature')) {
                    console.error('[YellowSession] Signature rejected — session key may be expired. Try resetting auth (resetAuth).');
                }
            }
        };

        webSocketService.addMessageListener(handler);
        return () => webSocketService.removeMessageListener(handler);
    }, [walletClient, sessionKey, sessionExpireTimestamp, account]);

    // ==================== CREATE APP SESSION ====================
    const createAppSession = useCallback(async (initialAmount: number = 100) => {
        if (!sessionKey || !account || !clobInfo?.authenticated) {
            alert('Please connect wallet and ensure CLOB server is running');
            return;
        }

        setIsSessionLoading(true);
        setAppSessionStatus('creating');

        try {
            const messageSigner = createECDSAMessageSigner(sessionKey.privateKey);
            const partnerAddress = clobInfo.address;

            const appDefinition = {
                application: APP_NAME,
                protocol: RPCProtocolVersion.NitroRPC_0_4,
                participants: [account, partnerAddress] as `0x${string}`[],
                weights: [50, 50],
                quorum: 100,
                challenge: 0,
                nonce: Date.now(),
            };

            const allocations = [
                { participant: account, asset: 'ytest.usd', amount: String(initialAmount) },
                { participant: partnerAddress, asset: 'ytest.usd', amount: '0' },
            ];

            // Safety timeout — clear loading state if no response in 20s
            const safetyTimeout = setTimeout(() => {
                console.error('[createAppSession] No response after 20s — clearing loading state');
                webSocketService.removeMessageListener(handleResponse);
                setAppSessionStatus('none');
                setIsSessionLoading(false);
            }, 20000);

            const handleResponse = async (data: unknown) => {
                const response = parseAnyRPCResponse(JSON.stringify(data));
                console.log('[createAppSession] WS response:', response.method, response.params);

                if (response.method === RPCMethod.CreateAppSession) {
                    clearTimeout(safetyTimeout);
                    const params = response.params as any;
                    if (params.appSessionId || params.app_session_id) {
                        const sid = params.appSessionId || params.app_session_id;
                        console.log('[createAppSession] Session created:', sid);
                        setAppSessionId(sid);
                        setAppSessionStatus('active');
                        setAppSessionVersion(1);
                        setPayerBalance(String(initialAmount));
                        setPayeeBalance('0');
                    } else {
                        console.error('[createAppSession] Error in response:', params);
                        alert(`Failed to create session: ${params.error || 'Unknown'}`);
                        setAppSessionStatus('none');
                    }
                    setIsSessionLoading(false);
                    webSocketService.removeMessageListener(handleResponse);
                }

                // Also catch error responses
                if (response.method === RPCMethod.Error) {
                    clearTimeout(safetyTimeout);
                    const msg = (response.params as any)?.error || 'Unknown error';
                    console.error('[createAppSession] RPC Error:', msg);
                    alert(`Session creation error: ${msg}`);
                    setAppSessionStatus('none');
                    setIsSessionLoading(false);
                    webSocketService.removeMessageListener(handleResponse);
                }
            };

            webSocketService.addMessageListener(handleResponse);

            console.log('[createAppSession] Creating message...');
            const msg = await createAppSessionMessage(messageSigner, { definition: appDefinition, allocations });
            const msgJson = JSON.parse(msg);
            console.log('[createAppSession] Getting CLOB co-signature...');
            const clobSig = await getCLOBSignature(msgJson);
            if (clobSig) {
                msgJson.sig.push(clobSig);
                console.log('[createAppSession] Sending with', msgJson.sig.length, 'signatures');
                console.log('[createAppSession] sig[0] (user):', msgJson.sig[0]?.slice(0, 20) + '...');
                console.log('[createAppSession] sig[1] (CLOB):', msgJson.sig[1]?.slice(0, 20) + '...');
                webSocketService.send(JSON.stringify(msgJson));
                console.log('[createAppSession] Sent! Waiting for response...');
            } else {
                console.error('[createAppSession] CLOB co-signature returned null — is CLOB server running?');
                alert('Failed to get CLOB co-signature. Check that the server is running.');
                setAppSessionStatus('none');
                setIsSessionLoading(false);
            }
        } catch (error) {
            console.error('Failed to create session:', error);
            setAppSessionStatus('none');
            setIsSessionLoading(false);
        }
    }, [sessionKey, account, clobInfo]);

    // ==================== INSTANT PAYMENT (user → CLOB) ====================
    const sendPaymentToCLOB = useCallback(async (amount: number): Promise<boolean> => {
        if (!sessionKey || !appSessionId || !account || !clobInfo) return false;

        try {
            const messageSigner = createECDSAMessageSigner(sessionKey.privateKey);
            const partnerAddress = clobInfo.address;

            const currentPayer = parseFloat(payerBalance);
            const currentPayee = parseFloat(payeeBalance);

            if (currentPayer < amount) {
                console.error('Insufficient session balance:', currentPayer, 'need:', amount);
                return false;
            }

            const newPayer = (currentPayer - amount).toString();
            const newPayee = (currentPayee + amount).toString();
            const nextVersion = appSessionVersion + 1;

            const stateMsg = await createSubmitAppStateMessage<RPCProtocolVersion.NitroRPC_0_4>(messageSigner, {
                app_session_id: appSessionId as `0x${string}`,
                intent: RPCAppStateIntent.Operate,
                version: nextVersion,
                allocations: [
                    { participant: account, asset: 'ytest.usd', amount: newPayer },
                    { participant: partnerAddress, asset: 'ytest.usd', amount: newPayee },
                ],
            });

            const msgJson = JSON.parse(stateMsg);
            const clobSig = await getCLOBSignature(msgJson);
            if (!clobSig) return false;

            msgJson.sig.push(clobSig);
            webSocketService.send(JSON.stringify(msgJson));

            setPayerBalance(newPayer);
            setPayeeBalance(newPayee);
            setAppSessionVersion(nextVersion);
            return true;
        } catch (error) {
            console.error('Payment failed:', error);
            return false;
        }
    }, [sessionKey, appSessionId, account, clobInfo, payerBalance, payeeBalance, appSessionVersion]);

    // ==================== RECEIVE PAYMENT FROM CLOB (CLOB → user) ====================
    const receivePaymentFromCLOB = useCallback(async (amount: number): Promise<boolean> => {
        if (!sessionKey || !appSessionId || !account || !clobInfo) return false;

        try {
            const messageSigner = createECDSAMessageSigner(sessionKey.privateKey);
            const partnerAddress = clobInfo.address;

            const currentPayer = parseFloat(payerBalance);
            const currentPayee = parseFloat(payeeBalance);

            if (currentPayee < amount) {
                console.error('CLOB insufficient session balance:', currentPayee, 'need:', amount);
                return false;
            }

            const newPayer = (currentPayer + amount).toString();
            const newPayee = (currentPayee - amount).toString();
            const nextVersion = appSessionVersion + 1;

            const stateMsg = await createSubmitAppStateMessage<RPCProtocolVersion.NitroRPC_0_4>(messageSigner, {
                app_session_id: appSessionId as `0x${string}`,
                intent: RPCAppStateIntent.Operate,
                version: nextVersion,
                allocations: [
                    { participant: account, asset: 'ytest.usd', amount: newPayer },
                    { participant: partnerAddress, asset: 'ytest.usd', amount: newPayee },
                ],
            });

            const msgJson = JSON.parse(stateMsg);
            const clobSig = await getCLOBSignature(msgJson);
            if (!clobSig) return false;

            msgJson.sig.push(clobSig);
            webSocketService.send(JSON.stringify(msgJson));

            setPayerBalance(newPayer);
            setPayeeBalance(newPayee);
            setAppSessionVersion(nextVersion);
            return true;
        } catch (error) {
            console.error('Receive payment failed:', error);
            return false;
        }
    }, [sessionKey, appSessionId, account, clobInfo, payerBalance, payeeBalance, appSessionVersion]);

    // ==================== DEPOSIT INTO SESSION ====================
    const depositToSession = useCallback(async (amount: number) => {
        if (!sessionKey || !appSessionId || !account || !clobInfo) return false;

        try {
            const messageSigner = createECDSAMessageSigner(sessionKey.privateKey);
            const partnerAddress = clobInfo.address;

            const newPayer = (parseFloat(payerBalance) + amount).toString();
            const nextVersion = appSessionVersion + 1;

            const submitMsg = await createSubmitAppStateMessage<typeof RPCProtocolVersion.NitroRPC_0_4>(messageSigner, {
                app_session_id: appSessionId as `0x${string}`,
                intent: RPCAppStateIntent.Deposit,
                version: nextVersion,
                allocations: [
                    { participant: account, asset: 'ytest.usd', amount: newPayer },
                    { participant: partnerAddress, asset: 'ytest.usd', amount: payeeBalance },
                ],
            });

            const msgJson = JSON.parse(submitMsg);
            const clobSig = await getCLOBSignature(msgJson);
            if (!clobSig) return false;

            msgJson.sig.push(clobSig);
            webSocketService.send(JSON.stringify(msgJson));

            setPayerBalance(newPayer);
            setAppSessionVersion(nextVersion);
            return true;
        } catch (error) {
            console.error('Deposit to session failed:', error);
            return false;
        }
    }, [sessionKey, appSessionId, account, clobInfo, payerBalance, payeeBalance, appSessionVersion]);

    // ==================== WITHDRAW FROM SESSION ====================
    const withdrawFromSession = useCallback(async (amount: number) => {
        if (!sessionKey || !appSessionId || !account || !clobInfo) return false;

        const current = parseFloat(payerBalance);
        if (amount > current) return false;

        try {
            const messageSigner = createECDSAMessageSigner(sessionKey.privateKey);
            const partnerAddress = clobInfo.address;

            const newPayer = (current - amount).toString();
            const nextVersion = appSessionVersion + 1;

            const submitMsg = await createSubmitAppStateMessage<typeof RPCProtocolVersion.NitroRPC_0_4>(messageSigner, {
                app_session_id: appSessionId as `0x${string}`,
                intent: RPCAppStateIntent.Withdraw,
                version: nextVersion,
                allocations: [
                    { participant: account, asset: 'ytest.usd', amount: newPayer },
                    { participant: partnerAddress, asset: 'ytest.usd', amount: payeeBalance },
                ],
            });

            const msgJson = JSON.parse(submitMsg);
            const clobSig = await getCLOBSignature(msgJson);
            if (!clobSig) return false;

            msgJson.sig.push(clobSig);
            webSocketService.send(JSON.stringify(msgJson));

            setPayerBalance(newPayer);
            setAppSessionVersion(nextVersion);
            return true;
        } catch (error) {
            console.error('Withdraw from session failed:', error);
            return false;
        }
    }, [sessionKey, appSessionId, account, clobInfo, payerBalance, payeeBalance, appSessionVersion]);

    // ==================== CLOSE SESSION ====================
    const closeSession = useCallback(async () => {
        if (!sessionKey || !appSessionId || !account || !clobInfo) {
            console.error('[closeSession] Missing required state:', { sessionKey: !!sessionKey, appSessionId, account, clobInfo: !!clobInfo });
            alert('Cannot close session — missing session data.');
            return;
        }

        setIsSessionLoading(true);
        setAppSessionStatus('closing');

        try {
            const messageSigner = createECDSAMessageSigner(sessionKey.privateKey);
            const partnerAddress = clobInfo.address;
            let currentVersion = appSessionVersion;

            // Step 1: Liquidate all shares back to USD on the CLOB server
            console.log('[closeSession] Liquidating shares...');
            try {
                const liqRes = await fetch(`${CLOB_SERVER_URL}/api/market/liquidate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user: account }),
                });
                const liqData = await liqRes.json();
                if (liqData.success && liqData.totalValue > 0) {
                    console.log(`[closeSession] Liquidated shares for $${liqData.totalValue}`);
                }
            } catch (err) {
                console.warn('[closeSession] Liquidation failed (continuing):', err);
            }

            // Step 2: Withdraw all funds to ledger — set both allocations to 0
            const totalFunds = parseFloat(payerBalance) + parseFloat(payeeBalance);
            if (totalFunds > 0) {
                console.log(`[closeSession] Withdrawing $${totalFunds} to ledger...`);
                currentVersion += 1;
                const withdrawMsg = await createSubmitAppStateMessage<typeof RPCProtocolVersion.NitroRPC_0_4>(messageSigner, {
                    app_session_id: appSessionId as `0x${string}`,
                    intent: RPCAppStateIntent.Withdraw,
                    version: currentVersion,
                    allocations: [
                        { participant: account, asset: 'ytest.usd', amount: '0' },
                        { participant: partnerAddress, asset: 'ytest.usd', amount: '0' },
                    ],
                });

                const msgJson = JSON.parse(withdrawMsg);
                const clobSig = await getCLOBSignature(msgJson);
                if (clobSig) {
                    msgJson.sig.push(clobSig);
                    webSocketService.send(JSON.stringify(msgJson));
                } else {
                    console.warn('[closeSession] No CLOB sig for withdraw, continuing to close...');
                }

                setPayerBalance('0');
                setPayeeBalance('0');
                setAppSessionVersion(currentVersion);
                await new Promise(r => setTimeout(r, 1500));
            }

            // Step 3: Close the app session
            console.log('[closeSession] Sending close message...');
            const handleResponse = async (data: unknown) => {
                const response = parseAnyRPCResponse(JSON.stringify(data));
                if (response.method === RPCMethod.CloseAppSession) {
                    const params = response.params as any;
                    if (params.success || !params.error) {
                        console.log('[closeSession] Session closed successfully');
                        setAppSessionId(null);
                        setAppSessionStatus('closed');
                        setAppSessionVersion(1);
                        setPayerBalance('0');
                        setPayeeBalance('0');
                        alert('Session closed! Funds returned to ledger.');
                    } else {
                        console.error('[closeSession] Close error:', params.error);
                        alert(`Close failed: ${params.error}`);
                        setAppSessionStatus('active');
                    }
                    setIsSessionLoading(false);
                    webSocketService.removeMessageListener(handleResponse);
                    clearTimeout(timeout);
                }
            };

            // Timeout so it doesn't hang forever
            const timeout = setTimeout(() => {
                webSocketService.removeMessageListener(handleResponse);
                console.warn('[closeSession] Close response timed out');
                setAppSessionId(null);
                setAppSessionStatus('closed');
                setAppSessionVersion(1);
                setPayerBalance('0');
                setPayeeBalance('0');
                setIsSessionLoading(false);
                alert('Session close timed out — session may already be closed.');
            }, 10000);

            webSocketService.addMessageListener(handleResponse);

            const closeMsg = await createCloseAppSessionMessage(messageSigner, {
                app_session_id: appSessionId as `0x${string}`,
                allocations: [
                    { participant: account, asset: 'ytest.usd', amount: '0' },
                    { participant: partnerAddress, asset: 'ytest.usd', amount: '0' },
                ],
            });

            const msgJson = JSON.parse(closeMsg);
            const clobSig = await getCLOBSignature(msgJson);
            if (clobSig) {
                msgJson.sig.push(clobSig);
                webSocketService.send(JSON.stringify(msgJson));
            } else {
                console.error('[closeSession] Failed to get CLOB signature for close');
                alert('Failed to get CLOB co-signature for close.');
                clearTimeout(timeout);
                webSocketService.removeMessageListener(handleResponse);
                setAppSessionStatus('active');
                setIsSessionLoading(false);
            }

        } catch (error) {
            console.error('Close session failed:', error);
            alert('Close session failed. Check console.');
            setAppSessionStatus('active');
            setIsSessionLoading(false);
        }
    }, [sessionKey, appSessionId, account, clobInfo, payerBalance, payeeBalance, appSessionVersion]);

    // ==================== FAUCET ====================
    const requestFaucet = useCallback(async () => {
        if (!account) return;
        try {
            const res = await fetch('https://clearnet-sandbox.yellow.com/faucet/requestTokens', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userAddress: account }),
            });
            const data = await res.json();
            if (data.success) alert(`Faucet: +${data.amount} ${data.asset} credited to ledger!`);
            else alert(`Faucet failed: ${data.message}`);
        } catch { alert('Faucet request failed'); }
    }, [account]);

    // ==================== RESET AUTH (force re-authentication) ====================
    const resetAuth = useCallback(() => {
        console.log('[resetAuth] Clearing session key and JWT, forcing re-auth...');
        removeSessionKey();
        removeJWT();
        setIsAuthenticated(false);
        setIsAuthAttempted(false);
        setBalances(null);
        // Generate fresh session key
        const sk = generateSessionKey();
        storeSessionKey(sk);
        setSessionKey(sk);
        // This will trigger the auto-auth useEffect
    }, []);

    return {
        // Wallet
        account,
        connectWallet,
        wsStatus,
        isAuthenticated,
        ledgerBalance: balances?.['ytest.usd'] ?? '0',
        clobInfo,

        // App Session
        appSessionId,
        appSessionStatus,
        payerBalance: parseFloat(payerBalance),
        payeeBalance: parseFloat(payeeBalance),
        isSessionLoading,

        // Actions
        createAppSession,
        sendPaymentToCLOB,
        receivePaymentFromCLOB,
        depositToSession,
        withdrawFromSession,
        closeSession,
        requestFaucet,
        resetAuth,
    };
}
