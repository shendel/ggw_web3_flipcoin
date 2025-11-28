import { useEffect, useState} from 'react';
import { useInjectedWeb3 } from '@/web3/InjectedWeb3Provider'
import fetchPlayerInfo from '@/helpers_flipgame/fetchPlayerInfo'
import {
  MAINNET_CHAIN_ID,
  GAME_CONTRACT,
  DEPOSIT_CONTRACT
} from '@/config'

const UserPanel = (props) => {
  const {
    isConnected,
    injectedAccount
  } = useInjectedWeb3()
  
  const [ isFetching, setIsFetching ] = useState(false)
  
  const { balance, onDeposit, onWithdraw } = props
  
  useEffect(() => {
    if (isConnected && injectedAccount) {
      setIsFetching(true)
      fetchPlayerInfo({
        playerAddress: injectedAccount,
        address: GAME_CONTRACT,
        chainId: MAINNET_CHAIN_ID
      }).then((answer) => {
        console.log(answer)
      }).catch((err) => {
        console.log('>err', err)
      })
    }
  }, [ isConnected, injectedAccount ])
  
  return (
    <div className="flex flex-col items-center justify-center p-6 bg-gray-800 rounded-xl shadow-lg max-w-xs mx-auto border border-gray-700">
      <h2 className="text-lg font-semibold text-gray-100 mb-4">Your Deposit balance</h2>
      <p className="text-3xl font-bold text-indigo-400 mb-6">
        {balance.toLocaleString()}{' '}
        <span className="text-sm font-normal text-gray-400">TOKEN</span>
      </p>

      <div className="flex space-x-4 w-full">
        <button
          onClick={onDeposit}
          className="flex-1 py-2 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition duration-200"
        >
          Deposit
        </button>
        <button
          onClick={onWithdraw}
          className="flex-1 py-2 px-4 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition duration-200"
        >
          Withdraw
        </button>
      </div>
    </div>
  );
};

export default UserPanel;