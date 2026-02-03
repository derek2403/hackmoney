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
