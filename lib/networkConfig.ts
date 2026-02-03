import type { Chain } from '@rainbow-me/rainbowkit';
import {
    sepolia
} from 'wagmi/chains';

export const chains = [sepolia] as const;

export const ENS_CHAIN_ID = sepolia.id;

export const ETH_REGISTRAR_CONTROLLER_ADDRESS = '0xfb3cE5D01e0f33f41DbB39035dB9745962F1f968';

// ENS Public Resolver on Sepolia
export const ENS_PUBLIC_RESOLVER_ADDRESS = '0x8FADE66B79cC9f707aB26799354482EB93a5B7dD';