import { useReadContract, useAccount } from 'wagmi';
import { namehash } from 'viem';
import { NAME_WRAPPER_ABI } from '../abis/NameWrapper';
import { NAME_WRAPPER_ADDRESS, ENS_CHAIN_ID } from '../networkConfig';

export interface UseParentDomainOwnershipOptions {
    parentName: string;  // e.g., "pm.eth"
}

export interface UseParentDomainOwnershipReturn {
    isOwner: boolean;
    isLoading: boolean;
    owner: `0x${string}` | undefined;
    isWrapped: boolean;
    error: Error | null;
}

export const useParentDomainOwnership = ({
    parentName
}: UseParentDomainOwnershipOptions): UseParentDomainOwnershipReturn => {
    const { address } = useAccount();

    // Calculate the namehash (also used as token ID for ERC-1155)
    const parentNode = namehash(parentName);
    // Convert namehash to bigint for ownerOf (ERC-1155 uses uint256 token ID)
    const tokenId = BigInt(parentNode);

    // Debug: log the namehash
    console.log('Parent name:', parentName);
    console.log('Parent node (namehash):', parentNode);
    console.log('Token ID:', tokenId.toString());
    console.log('Connected address:', address);

    // Use ownerOf to get the owner (ERC-1155 standard function)
    const {
        data: owner,
        isLoading,
        error
    } = useReadContract({
        address: NAME_WRAPPER_ADDRESS,
        abi: NAME_WRAPPER_ABI,
        functionName: 'ownerOf',
        args: [tokenId],
        chainId: ENS_CHAIN_ID
    });

    // Debug: log the response
    console.log('Owner from ownerOf:', owner);
    console.log('ownerOf error:', error);

    // Check if wrapped (owner is not zero address and not undefined)
    const isWrapped = owner !== undefined &&
        owner !== '0x0000000000000000000000000000000000000000';

    // Check if connected wallet is owner
    const isOwner = Boolean(
        address &&
        owner &&
        address.toLowerCase() === (owner as string).toLowerCase()
    );

    console.log('isWrapped:', isWrapped);
    console.log('isOwner:', isOwner);

    return {
        isOwner,
        isLoading,
        owner: owner as `0x${string}` | undefined,
        isWrapped,
        error: error as Error | null
    };
};
