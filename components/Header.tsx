import { ConnectButton } from '@rainbow-me/rainbowkit';
import { EnsProfile } from './EnsProfile';

export const Header = () => {
    return (
        <header className="flex justify-between items-center p-4 backdrop-blur-md bg-white/30 border-b border-white/20">
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                HackMoney
            </h1>
            <div className="flex items-center gap-4">
                <EnsProfile />
                <ConnectButton />
            </div>
        </header>
    );
};
