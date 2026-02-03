import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { ETH_REGISTRAR_CONTROLLER_ADDRESS, ENS_CHAIN_ID } from '../networkConfig';
import { ETH_REGISTRAR_CONTROLLER_ABI } from '../abis/EthRegistrarController';
import type { RegistrationParams } from './types';

export const useEnsRegister = () => {
    const { writeContract, data: hash, isPending, error, reset } = useWriteContract();

    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
        hash,
    });

    const register = (params: RegistrationParams, value: bigint) => {
        // Pass as tuple for Sepolia contract
        writeContract({
            address: ETH_REGISTRAR_CONTROLLER_ADDRESS,
            abi: ETH_REGISTRAR_CONTROLLER_ABI,
            functionName: 'register',
            args: [params],
            value,
            chainId: ENS_CHAIN_ID,
        });
    };

    return {
        register,
        hash,
        isPending,
        isConfirming,
        isConfirmed,
        error,
        reset,
    };
};
