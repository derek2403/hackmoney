// ENS ETHRegistrarController ABI (Sepolia)
// Address: 0xfb3cE5D01e0f33f41DbB39035dB9745962F1f968

export const ETH_REGISTRAR_CONTROLLER_ABI = [
    // Read functions
    {
        inputs: [{ internalType: 'string', name: 'name', type: 'string' }],
        name: 'available',
        outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [{ internalType: 'string', name: 'name', type: 'string' }],
        name: 'valid',
        outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
        stateMutability: 'pure',
        type: 'function',
    },
    {
        inputs: [
            { internalType: 'string', name: 'label', type: 'string' },
            { internalType: 'uint256', name: 'duration', type: 'uint256' },
        ],
        name: 'rentPrice',
        outputs: [
            {
                components: [
                    { internalType: 'uint256', name: 'base', type: 'uint256' },
                    { internalType: 'uint256', name: 'premium', type: 'uint256' },
                ],
                internalType: 'struct IPriceOracle.Price',
                name: 'price',
                type: 'tuple',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
        name: 'commitments',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'minCommitmentAge',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'maxCommitmentAge',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    // Registration struct type for makeCommitment and register
    // struct Registration {
    //   string label;
    //   address owner;
    //   uint256 duration;
    //   bytes32 secret;
    //   address resolver;
    //   bytes[] data;
    //   uint8 reverseRecord;
    //   bytes32 referrer;
    // }
    {
        inputs: [
            {
                components: [
                    { internalType: 'string', name: 'label', type: 'string' },
                    { internalType: 'address', name: 'owner', type: 'address' },
                    { internalType: 'uint256', name: 'duration', type: 'uint256' },
                    { internalType: 'bytes32', name: 'secret', type: 'bytes32' },
                    { internalType: 'address', name: 'resolver', type: 'address' },
                    { internalType: 'bytes[]', name: 'data', type: 'bytes[]' },
                    { internalType: 'uint8', name: 'reverseRecord', type: 'uint8' },
                    { internalType: 'bytes32', name: 'referrer', type: 'bytes32' },
                ],
                internalType: 'struct IETHRegistrarController.Registration',
                name: 'registration',
                type: 'tuple',
            },
        ],
        name: 'makeCommitment',
        outputs: [{ internalType: 'bytes32', name: 'commitment', type: 'bytes32' }],
        stateMutability: 'pure',
        type: 'function',
    },
    {
        inputs: [{ internalType: 'bytes32', name: 'commitment', type: 'bytes32' }],
        name: 'commit',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                components: [
                    { internalType: 'string', name: 'label', type: 'string' },
                    { internalType: 'address', name: 'owner', type: 'address' },
                    { internalType: 'uint256', name: 'duration', type: 'uint256' },
                    { internalType: 'bytes32', name: 'secret', type: 'bytes32' },
                    { internalType: 'address', name: 'resolver', type: 'address' },
                    { internalType: 'bytes[]', name: 'data', type: 'bytes[]' },
                    { internalType: 'uint8', name: 'reverseRecord', type: 'uint8' },
                    { internalType: 'bytes32', name: 'referrer', type: 'bytes32' },
                ],
                internalType: 'struct IETHRegistrarController.Registration',
                name: 'registration',
                type: 'tuple',
            },
        ],
        name: 'register',
        outputs: [],
        stateMutability: 'payable',
        type: 'function',
    },
    {
        inputs: [
            { internalType: 'string', name: 'label', type: 'string' },
            { internalType: 'uint256', name: 'duration', type: 'uint256' },
            { internalType: 'bytes32', name: 'referrer', type: 'bytes32' },
        ],
        name: 'renew',
        outputs: [],
        stateMutability: 'payable',
        type: 'function',
    },
] as const;
