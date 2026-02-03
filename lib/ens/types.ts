// ENS Registration types

export interface Registration {
    label: string;
    owner: `0x${string}`;
    duration: bigint;
    secret: `0x${string}`;
    resolver: `0x${string}`;
    data: `0x${string}`[];
    reverseRecord: number;
    referrer: `0x${string}`;
}

export type RegistrationStep =
    | 'idle'
    | 'committing'
    | 'waiting'
    | 'registering'
    | 'success'
    | 'error';
