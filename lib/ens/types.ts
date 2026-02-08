// ENS Registration types for Sepolia contract

export interface RegistrationParams {
    label: string;
    owner: `0x${string}`;
    duration: bigint;
    secret: `0x${string}`;
    resolver: `0x${string}`;
    data: `0x${string}`[];
    reverseRecord: number;  // uint8 in Sepolia contract
    referrer: `0x${string}`; // bytes32 in Sepolia contract
}

export type RegistrationStep =
    | 'idle'
    | 'committing'
    | 'waiting'
    | 'registering'
    | 'success'
    | 'error';

// Subdomain creation types
export interface SubdomainParams {
    parentNode: `0x${string}`;  // namehash of parent (e.g., namehash("pm.eth"))
    label: string;               // subdomain label (e.g., "trump2024")
    owner: `0x${string}`;        // address to own the subdomain
    resolver: `0x${string}`;     // resolver address (can be market contract)
    ttl: bigint;                 // time-to-live (usually 0)
    fuses: number;               // fuse bits to burn
    expiry: bigint;              // expiry timestamp
}

export type SubdomainStep =
    | 'idle'
    | 'creating'
    | 'success'
    | 'error';

export interface MarketSubdomain {
    label: string;               // e.g., "trump2024"
    fullName: string;            // e.g., "trump2024.pm.eth"
    node: `0x${string}`;         // namehash of the subdomain
    owner: `0x${string}`;        // owner address
    resolver: `0x${string}`;     // resolver address (market contract)
    expiry: bigint;              // when it expires
}
