import { useAccount, useEnsAvatar, useEnsName } from 'wagmi';
import { ENS_CHAIN_ID } from '../lib/networkConfig';

export const EnsProfile = () => {
    const { address } = useAccount()
    const { data: name } = useEnsName({ address, chainId: ENS_CHAIN_ID })
    const { data: avatar } = useEnsAvatar({ name: name!, chainId: ENS_CHAIN_ID })

    if (!address) return null;

    return (
        <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 shadow-sm">
            {avatar ? (
                <img src={avatar} alt="ENS" className="h-6 w-6 rounded-full" />
            ) : (
                <div className="h-6 w-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-500" />
            )}
            <div className="flex flex-col leading-none">
                <span className="font-semibold text-sm">{name || 'No Name'}</span>
                <span className="text-gray-400 text-[10px]">{address.slice(0, 6)}...{address.slice(-4)}</span>
            </div>
        </div>
    )
}
