import type { Chain } from '@rainbow-me/rainbowkit';
import {
    sepolia
} from 'wagmi/chains';

export const chains = [sepolia] as const;

export const ENS_CHAIN_ID = sepolia.id;