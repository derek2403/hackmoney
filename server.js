const WebSocket = require('ws');
const { createHash } = require('crypto');
const { privateKeyToAccount, generatePrivateKey } = require('viem/accounts');
const { createWalletClient, http, keccak256, toBytes, hexToBytes, bytesToHex, stringToHex } = require('viem');
const { sepolia } = require('viem/chains');
const http_module = require('http');

// ==================== CONFIGURATION ====================
const CLEARNODE_WS_URL = process.env.CLEARNODE_WS_URL || 'wss://clearnet-sandbox.yellow.com/ws';
const CLOB_PRIVATE_KEY = process.env.CLOB_PRIVATE_KEY || generatePrivateKey();
const SERVER_PORT = process.env.SERVER_PORT || 3001;
const SESSION_DURATION = 3600; // 1 hour
const AUTH_SCOPE = 'yellow-workshop.app';
const APP_NAME = 'Yellow Workshop CLOB';

// ==================== CLOB WALLET SETUP ====================
const clobAccount = privateKeyToAccount(CLOB_PRIVATE_KEY);
console.log('==============================================');
console.log('CLOB Server Starting...');
console.log('CLOB Wallet Address:', clobAccount.address);
console.log('==============================================');

// ==================== STATE ====================
let wsConnection = null;
let wsStatus = 'disconnected';
let sessionKey = null;
let isAuthenticated = false;
let pendingRequests = new Map();
let sessionExpireTimestamp = '';

// ==================== SESSION KEY UTILITIES ====================
function generateSessionKeyPair() {
    const privateKey = generatePrivateKey();
    const account = privateKeyToAccount(privateKey);
    return { privateKey, address: account.address };
}

// ==================== MESSAGE SIGNING ====================
// ECDSA message signer for session key
async function createECDSAMessageSigner(privateKey) {
    const account = privateKeyToAccount(privateKey);
    return async (payload) => {
        const message = JSON.stringify(payload);
        const signature = await account.signMessage({ message });
        return signature;
    };
}

// ==================== RPC MESSAGE UTILITIES ====================
function generateRequestId() {
    return Math.floor(Math.random() * 2147483647);
}

function getCurrentTimestamp() {
    return Math.floor(Date.now() / 1000);
}

function createRPCRequest(method, params = {}) {
    const requestId = generateRequestId();
    const timestamp = getCurrentTimestamp();
    const requestData = [requestId, method, params, timestamp];
    return { req: requestData, sig: [] };
}

async function signRPCMessage(message, signer) {
    const signature = await signer(message.req);
    message.sig = [signature];
    return message;
}

// ==================== WEBSOCKET CONNECTION ====================
function connectToYellow() {
    console.log('Connecting to Yellow Network:', CLEARNODE_WS_URL);
    wsStatus = 'connecting';

    wsConnection = new WebSocket(CLEARNODE_WS_URL);

    wsConnection.on('open', () => {
        console.log('✓ WebSocket Connected to Yellow Network');
        wsStatus = 'connected';

        // Start authentication flow
        startAuthentication();
    });

    wsConnection.on('message', async (data) => {
        try {
            const message = JSON.parse(data.toString());
            await handleMessage(message);
        } catch (error) {
            console.error('Error parsing message:', error);
        }
    });

    wsConnection.on('close', () => {
        console.log('WebSocket disconnected');
        wsStatus = 'disconnected';
        isAuthenticated = false;

        // Reconnect after delay
        setTimeout(connectToYellow, 5000);
    });

    wsConnection.on('error', (error) => {
        console.error('WebSocket error:', error.message);
        wsStatus = 'error';
    });
}

function sendMessage(payload) {
    if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
        const message = typeof payload === 'string' ? payload : JSON.stringify(payload);
        wsConnection.send(message);
    } else {
        console.error('WebSocket not connected');
    }
}

// ==================== AUTHENTICATION FLOW ====================
async function startAuthentication() {
    // Generate session key for CLOB
    sessionKey = generateSessionKeyPair();
    console.log('CLOB Session Key:', sessionKey.address);

    const expireTimestamp = Math.floor(Date.now() / 1000) + SESSION_DURATION;
    sessionExpireTimestamp = String(expireTimestamp);

    // Create auth request - format must match SDK AuthRequestParams
    const authParams = {
        address: clobAccount.address,
        session_key: sessionKey.address,
        expires_at: expireTimestamp, // Unix timestamp as number
        scope: AUTH_SCOPE,
        application: APP_NAME,
        allowances: [
            { asset: 'ytest.usd', amount: '1000000' },
        ],
    };

    const authRequest = createRPCRequest('auth_request', authParams);
    console.log('Sending auth request...', JSON.stringify(authRequest, null, 2));
    sendMessage(authRequest);
}

async function handleAuthChallenge(response) {
    console.log('Received auth challenge response:', JSON.stringify(response, null, 2));

    // Extract challenge from response - check for both formats
    const params = response.res ? response.res[2] : response.params;
    const challenge = params?.challengeMessage || params?.challenge_message || params?.challenge;

    if (!challenge) {
        console.error('No challenge in response, params:', params);
        return;
    }

    console.log('Challenge extracted:', challenge);

    // EIP-712 domain - must match the SDK's EIP712AuthDomain
    const domain = {
        name: APP_NAME,
    };

    // EIP-712 types - must match SDK's EIP712AuthTypes exactly
    const types = {
        Policy: [
            { name: 'challenge', type: 'string' },
            { name: 'scope', type: 'string' },
            { name: 'wallet', type: 'address' },
            { name: 'session_key', type: 'address' },  // Note: session_key not participant
            { name: 'expires_at', type: 'uint64' },    // Note: expires_at not expire, uint64 not uint256
            { name: 'allowances', type: 'Allowance[]' },
        ],
        Allowance: [
            { name: 'asset', type: 'string' },
            { name: 'amount', type: 'string' },  // Note: string not uint256
        ],
    };

    // EIP-712 message - must match SDK's EIP712AuthMessage
    const message = {
        challenge: challenge,
        scope: AUTH_SCOPE,
        wallet: clobAccount.address,
        session_key: sessionKey.address,
        expires_at: BigInt(sessionExpireTimestamp),
        allowances: [
            { asset: 'ytest.usd', amount: '1000000' },
        ],
    };

    try {
        // Sign with CLOB wallet using EIP-712
        const walletClient = createWalletClient({
            account: clobAccount,
            chain: sepolia,
            transport: http(),
        });

        const signature = await walletClient.signTypedData({
            domain,
            types,
            primaryType: 'Policy',
            message,
        });

        console.log('EIP-712 signature created:', signature.slice(0, 20) + '...');

        // Create auth verify request - params is just {challenge: '...'}
        // The signature goes in the sig array (like NitroliteRPC.signRequestMessage)
        const verifyRequest = createRPCRequest('auth_verify', { challenge: challenge });
        verifyRequest.sig = [signature];

        console.log('Sending auth verify:', JSON.stringify(verifyRequest, null, 2));
        sendMessage(verifyRequest);

    } catch (error) {
        console.error('Failed to sign auth challenge:', error);
    }
}

// ==================== MESSAGE HANDLER ====================
async function handleMessage(data) {
    const method = data.res ? data.res[1] : data.method;

    // Handle responses
    if (data.res) {
        const [requestId, responseMethod, params] = data.res;

        // Check if this is a response to a pending request
        if (pendingRequests.has(requestId)) {
            const { resolve } = pendingRequests.get(requestId);
            pendingRequests.delete(requestId);
            resolve(data);
        }

        switch (responseMethod) {
            case 'auth_challenge':
                await handleAuthChallenge(data);
                break;

            case 'auth_verify':
                if (params?.success) {
                    console.log('✓ CLOB Authenticated with Yellow Network');
                    isAuthenticated = true;
                } else {
                    console.error('Auth verify failed:', params);
                }
                break;

            case 'error':
                console.error('RPC Error:', params);
                break;

            default:
                console.log('Response:', responseMethod, params);
        }
    }

    // Handle incoming requests/notifications
    if (data.req) {
        const [requestId, reqMethod, params] = data.req;
        console.log('Incoming request:', reqMethod);
    }
}

// ==================== SIGNING API ====================

// Sign a message payload with CLOB session key
async function signPayload(payload) {
    if (!sessionKey) {
        throw new Error('CLOB not authenticated');
    }

    const signer = await createECDSAMessageSigner(sessionKey.privateKey);
    const signature = await signer(payload);
    return signature;
}

// HTTP API handler for signing requests
async function handleSignRequest(req, res, body) {
    try {
        const { action, payload, message } = JSON.parse(body);

        if (!isAuthenticated) {
            res.writeHead(503, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'CLOB not authenticated' }));
            return;
        }

        let signature;

        switch (action) {
            case 'sign-create-session':
            case 'sign-state-update':
            case 'sign-close-session':
                // Sign the req payload from the message
                if (!message || !message.req) {
                    throw new Error('Missing message.req payload');
                }
                signature = await signPayload(message.req);
                break;

            case 'get-clob-address':
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    address: clobAccount.address,
                    sessionKey: sessionKey?.address,
                    authenticated: isAuthenticated
                }));
                return;

            default:
                throw new Error(`Unknown action: ${action}`);
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ signature }));

    } catch (error) {
        console.error('Sign request error:', error);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
    }
}

// ==================== HTTP SERVER ====================
const httpServer = http_module.createServer((req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (req.method === 'GET' && req.url === '/status') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: wsStatus,
            authenticated: isAuthenticated,
            clobAddress: clobAccount.address,
            sessionKey: sessionKey?.address,
        }));
        return;
    }

    if (req.method === 'GET' && req.url === '/clob-address') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            address: clobAccount.address,
            sessionKey: sessionKey?.address,
            authenticated: isAuthenticated,
        }));
        return;
    }

    if (req.method === 'POST' && req.url === '/api/sign') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => handleSignRequest(req, res, body));
        return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
});

// ==================== START SERVER ====================
httpServer.listen(SERVER_PORT, () => {
    console.log(`CLOB Server listening on port ${SERVER_PORT}`);
    console.log(`Status endpoint: http://localhost:${SERVER_PORT}/status`);
    console.log(`CLOB address endpoint: http://localhost:${SERVER_PORT}/clob-address`);
    console.log(`Sign endpoint: POST http://localhost:${SERVER_PORT}/api/sign`);
    console.log('');

    // Connect to Yellow Network
    connectToYellow();
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down CLOB server...');
    if (wsConnection) {
        wsConnection.close();
    }
    httpServer.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});
