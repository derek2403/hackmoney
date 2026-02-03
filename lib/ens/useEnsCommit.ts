import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { ETH_REGISTRAR_CONTROLLER_ADDRESS, ENS_CHAIN_ID } from '../networkConfig';
import { ETH_REGISTRAR_CONTROLLER_ABI } from '../abis/EthRegistrarController';

export const useEnsCommit = () => {
    const { writeContract, data: hash, isPending, error, reset } = useWriteContract();

    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
        hash,
    });

    const commit = (commitment: `0x${string}`) => {
        writeContract({
            address: ETH_REGISTRAR_CONTROLLER_ADDRESS,
            abi: ETH_REGISTRAR_CONTROLLER_ABI,
            functionName: 'commit',
            args: [commitment],
            chainId: ENS_CHAIN_ID,
        });
    };

    return {
        commit,
        hash,
        isPending,
        isConfirming,
        isConfirmed,
        error,
        reset,
    };
};
