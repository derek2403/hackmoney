import type { Chain } from '@rainbow-me/rainbowkit';
import {
    sepolia
} from 'wagmi/chains';

export const chains = [sepolia] as const;

export const ENS_CHAIN_ID = sepolia.id;

export const ETH_REGISTRAR_CONTROLLER_ADDRESS = '0xfb3cE5D01e0f33f41DbB39035dB9745962F1f968';

// ENS Public Resolver on Sepolia
export const ENS_PUBLIC_RESOLVER_ADDRESS = '0xE99638b40E4Fff0129D56f03b55b6bbC4BBE49b5' as `0x${string}`;