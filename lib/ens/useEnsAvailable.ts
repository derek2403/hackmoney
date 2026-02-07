import { useReadContract } from 'wagmi';
import { ETH_REGISTRAR_CONTROLLER_ADDRESS, ENS_CHAIN_ID } from '../networkConfig';
import { ETH_REGISTRAR_CONTROLLER_ABI } from '../abis/EthRegistrarController';

export const useEnsAvailable = (name: string | undefined) => {
    return useReadContract({
        address: ETH_REGISTRAR_CONTROLLER_ADDRESS,
        abi: ETH_REGISTRAR_CONTROLLER_ABI,
        functionName: 'available',
        args: name ? [name] : undefined,
        chainId: ENS_CHAIN_ID,
        query: {
            enabled: Boolean(name && name.length >= 3),
        }
    });
};
