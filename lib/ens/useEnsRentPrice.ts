import { useReadContract } from 'wagmi';
import { ETH_REGISTRAR_CONTROLLER_ADDRESS, ENS_CHAIN_ID } from '../networkConfig';
import { ETH_REGISTRAR_CONTROLLER_ABI } from '../abis/EthRegistrarController';

// Default registration duration: 1 year in seconds
export const ONE_YEAR_SECONDS = BigInt(365 * 24 * 60 * 60);

export const useEnsRentPrice = (name: string | undefined, duration: bigint = ONE_YEAR_SECONDS) => {
    return useReadContract({
        address: ETH_REGISTRAR_CONTROLLER_ADDRESS,
        abi: ETH_REGISTRAR_CONTROLLER_ABI,
        functionName: 'rentPrice',
        args: name ? [name, duration] : undefined,
        chainId: ENS_CHAIN_ID,
        query: {
            enabled: Boolean(name && name.length >= 3),
        }
    });
};
