// SwapRouter ABI - subset for frontend interaction
export const SWAP_ROUTER_ABI = [
    {
        type: 'function',
        name: 'createMarket',
        inputs: [{ name: 'marketName', type: 'string' }],
        outputs: [
            { name: 'tokens', type: 'address[8]' },
            { name: 'receivers', type: 'address[8]' }
        ],
        stateMutability: 'nonpayable'
    },
    {
        type: 'function',
        name: 'buyCorner',
        inputs: [
            { name: 'marketName', type: 'string' },
            { name: 'corner', type: 'string' },
            { name: 'buyer', type: 'address' }
        ],
        outputs: [],
        stateMutability: 'payable'
    },
    {
        type: 'function',
        name: 'getMarketReceivers',
        inputs: [{ name: 'marketName', type: 'string' }],
        outputs: [{ name: 'receivers', type: 'address[8]' }],
        stateMutability: 'view'
    },
    {
        type: 'function',
        name: 'getMarketTokens',
        inputs: [{ name: 'marketName', type: 'string' }],
        outputs: [{ name: 'tokens', type: 'address[8]' }],
        stateMutability: 'view'
    },
    {
        type: 'function',
        name: 'marketExists',
        inputs: [{ name: 'marketName', type: 'string' }],
        outputs: [{ type: 'bool' }],
        stateMutability: 'view'
    },
    {
        type: 'function',
        name: 'cornerTokens',
        inputs: [
            { name: 'marketName', type: 'string' },
            { name: 'corner', type: 'string' }
        ],
        outputs: [{ type: 'address' }],
        stateMutability: 'view'
    },
    {
        type: 'function',
        name: 'cornerReceivers',
        inputs: [
            { name: 'marketName', type: 'string' },
            { name: 'corner', type: 'string' }
        ],
        outputs: [{ type: 'address' }],
        stateMutability: 'view'
    },
    {
        type: 'function',
        name: 'CORNERS',
        inputs: [{ name: 'index', type: 'uint256' }],
        outputs: [{ type: 'string' }],
        stateMutability: 'view'
    },
    {
        type: 'event',
        name: 'MarketCreated',
        inputs: [
            { name: 'marketName', type: 'string', indexed: true },
            { name: 'tokens', type: 'address[8]', indexed: false },
            { name: 'receivers', type: 'address[8]', indexed: false }
        ]
    },
    {
        type: 'event',
        name: 'CornerPurchased',
        inputs: [
            { name: 'marketName', type: 'string', indexed: true },
            { name: 'corner', type: 'string', indexed: false },
            { name: 'buyer', type: 'address', indexed: true },
            { name: 'amount', type: 'uint256', indexed: false }
        ]
    }
] as const;
