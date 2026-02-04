// ENS NameWrapper ABI (Sepolia)
// Address: 0x0635513f179D50A207757E05759CbD106d7dFcE8

export const NAME_WRAPPER_ABI = [
    // ============ Wrapping Functions ============

    // Wrap a .eth 2LD (second-level domain like myname.eth)
    {
        inputs: [
            { internalType: 'string', name: 'label', type: 'string' },
            { internalType: 'address', name: 'wrappedOwner', type: 'address' },
            { internalType: 'uint16', name: 'ownerControlledFuses', type: 'uint16' },
            { internalType: 'address', name: 'resolver', type: 'address' },
        ],
        name: 'wrapETH2LD',
        outputs: [{ internalType: 'uint64', name: 'expiry', type: 'uint64' }],
        stateMutability: 'nonpayable',
        type: 'function',
    },

    // Wrap any other ENS name
    {
        inputs: [
            { internalType: 'bytes', name: 'name', type: 'bytes' },
            { internalType: 'address', name: 'wrappedOwner', type: 'address' },
            { internalType: 'address', name: 'resolver', type: 'address' },
        ],
        name: 'wrap',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },

    // ============ Unwrapping Functions ============

    {
        inputs: [
            { internalType: 'bytes32', name: 'labelhash', type: 'bytes32' },
            { internalType: 'address', name: 'registrant', type: 'address' },
            { internalType: 'address', name: 'controller', type: 'address' },
        ],
        name: 'unwrapETH2LD',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },

    {
        inputs: [
            { internalType: 'bytes32', name: 'parentNode', type: 'bytes32' },
            { internalType: 'bytes32', name: 'labelhash', type: 'bytes32' },
            { internalType: 'address', name: 'controller', type: 'address' },
        ],
        name: 'unwrap',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },

    // ============ Subname Creation ============

    // Create subname with just owner (simpler)
    {
        inputs: [
            { internalType: 'bytes32', name: 'parentNode', type: 'bytes32' },
            { internalType: 'string', name: 'label', type: 'string' },
            { internalType: 'address', name: 'owner', type: 'address' },
            { internalType: 'uint32', name: 'fuses', type: 'uint32' },
            { internalType: 'uint64', name: 'expiry', type: 'uint64' },
        ],
        name: 'setSubnodeOwner',
        outputs: [{ internalType: 'bytes32', name: 'node', type: 'bytes32' }],
        stateMutability: 'nonpayable',
        type: 'function',
    },

    // Create subname with owner, resolver, and TTL
    {
        inputs: [
            { internalType: 'bytes32', name: 'parentNode', type: 'bytes32' },
            { internalType: 'string', name: 'label', type: 'string' },
            { internalType: 'address', name: 'owner', type: 'address' },
            { internalType: 'address', name: 'resolver', type: 'address' },
            { internalType: 'uint64', name: 'ttl', type: 'uint64' },
            { internalType: 'uint32', name: 'fuses', type: 'uint32' },
            { internalType: 'uint64', name: 'expiry', type: 'uint64' },
        ],
        name: 'setSubnodeRecord',
        outputs: [{ internalType: 'bytes32', name: 'node', type: 'bytes32' }],
        stateMutability: 'nonpayable',
        type: 'function',
    },

    // ============ Fuse Management ============

    {
        inputs: [
            { internalType: 'bytes32', name: 'node', type: 'bytes32' },
            { internalType: 'uint16', name: 'ownerControlledFuses', type: 'uint16' },
        ],
        name: 'setFuses',
        outputs: [{ internalType: 'uint32', name: '', type: 'uint32' }],
        stateMutability: 'nonpayable',
        type: 'function',
    },

    {
        inputs: [
            { internalType: 'bytes32', name: 'parentNode', type: 'bytes32' },
            { internalType: 'bytes32', name: 'labelhash', type: 'bytes32' },
            { internalType: 'uint32', name: 'fuses', type: 'uint32' },
            { internalType: 'uint64', name: 'expiry', type: 'uint64' },
        ],
        name: 'setChildFuses',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },

    // ============ Approval Functions ============

    // ERC-1155 batch approval (full control)
    {
        inputs: [
            { internalType: 'address', name: 'operator', type: 'address' },
            { internalType: 'bool', name: 'approved', type: 'bool' },
        ],
        name: 'setApprovalForAll',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },

    // ERC-721 style single approval (subname renewal manager)
    {
        inputs: [
            { internalType: 'address', name: 'to', type: 'address' },
            { internalType: 'uint256', name: 'tokenId', type: 'uint256' },
        ],
        name: 'approve',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },

    // ============ View Functions ============

    // Get owner of wrapped name (ERC-1155)
    {
        inputs: [{ internalType: 'uint256', name: 'id', type: 'uint256' }],
        name: 'ownerOf',
        outputs: [{ internalType: 'address', name: 'owner', type: 'address' }],
        stateMutability: 'view',
        type: 'function',
    },

    // Check if a name is wrapped
    {
        inputs: [{ internalType: 'bytes32', name: 'node', type: 'bytes32' }],
        name: 'isWrapped',
        outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
        stateMutability: 'view',
        type: 'function',
    },

    // Get fuses and expiry for a name
    {
        inputs: [{ internalType: 'bytes32', name: 'node', type: 'bytes32' }],
        name: 'getData',
        outputs: [
            { internalType: 'address', name: 'owner', type: 'address' },
            { internalType: 'uint32', name: 'fuses', type: 'uint32' },
            { internalType: 'uint64', name: 'expiry', type: 'uint64' },
        ],
        stateMutability: 'view',
        type: 'function',
    },

    // Check if approved for all (ERC-1155)
    {
        inputs: [
            { internalType: 'address', name: 'account', type: 'address' },
            { internalType: 'address', name: 'operator', type: 'address' },
        ],
        name: 'isApprovedForAll',
        outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
        stateMutability: 'view',
        type: 'function',
    },

    // Get approved address for token (renewal manager)
    {
        inputs: [{ internalType: 'uint256', name: 'id', type: 'uint256' }],
        name: 'getApproved',
        outputs: [{ internalType: 'address', name: '', type: 'address' }],
        stateMutability: 'view',
        type: 'function',
    },
] as const;

// ============ Fuse Constants ============
// Parent-Controlled Fuses (bits 0-15)
export const PARENT_CANNOT_CONTROL = 1 << 16; // 65536 - Parent cannot change fuses or owner
export const IS_DOT_ETH = 1 << 17; // 131072 - Set automatically for .eth names

// Owner-Controlled Fuses (bits 16-31)
export const CANNOT_UNWRAP = 1; // Cannot unwrap the name
export const CANNOT_BURN_FUSES = 2; // Cannot burn any more fuses
export const CANNOT_TRANSFER = 4; // Cannot transfer the name
export const CANNOT_SET_RESOLVER = 8; // Cannot change the resolver
export const CANNOT_SET_TTL = 16; // Cannot change the TTL
export const CANNOT_CREATE_SUBDOMAIN = 32; // Cannot create subdomains
export const CANNOT_APPROVE = 64; // Cannot change the approved renewal manager
