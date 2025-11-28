import React, { useState, useEffect } from 'react';
import { fromWei, toWei } from '@/helpers/wei'
import BigNumber from "bignumber.js"
import { useInjectedWeb3 } from '@/web3/InjectedWeb3Provider'
import { useConfirmationModal } from '@/components/ConfirmationModal'

import {
  MAINNET_CHAIN_ID
} from '@/config'

const GameInfoModal = (props) => {
  const {
    gameInfo
  } = props

  const { closeModal } = useConfirmationModal()

  const inputClass = "w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-white placeholder-gray-500"

  console.log('[gameInfo]', gameInfo)
  return (
    <>
      <div>
        <span>Game ID:</span>
        <input type="text"
          value={gameInfo.gameId} readOnly={true}
          className={inputClass} />
      </div>
      <div>
        <span>Choised Side:</span>
        <input type="text"
          value={gameInfo.chosenSide ? 'Heads' : 'Tails'} readOnly={true}
          className={inputClass} />
      </div>
      <div>
        <span>Win Side:</span>
        <input type="text"
          value={gameInfo.wonAmount != "0"
            ? gameInfo.chosenSide ? 'Heads' : 'Tails'
            : gameInfo.chosenSide ? 'Tails' : 'Heads'} readOnly={true}
          className={inputClass} />
      </div>
      <div>
        <span>Generated Random:</span>
        <input type="text"
          value={gameInfo.random} readOnly={true}
          className={inputClass} />
      </div>
      <div>
        <span>Random Request ID:</span>
        <input type="text"
          value={gameInfo.requestId} readOnly={true}
          className={inputClass} />
      </div>
      <div>
        <span>Random Hash:</span>
        <input type="text"
          value={gameInfo.hash} readOnly={true}
          className={inputClass} />
      </div>
      <div className="pt-2">
        <button
          onClick={() => { closeModal('GAME_INFO') }}
          className={`w-full py-3 px-4 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition duration-200`}
        >
          Close
        </button>
      </div>
    </>
  );
};

export default GameInfoModal;