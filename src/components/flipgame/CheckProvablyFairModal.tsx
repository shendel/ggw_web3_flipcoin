import React, { useState, useEffect } from 'react';
import { fromWei, toWei } from '@/helpers/wei'
import BigNumber from "bignumber.js"
import { useInjectedWeb3 } from '@/web3/InjectedWeb3Provider'
import { useConfirmationModal } from '@/components/ConfirmationModal'
import Web3 from 'web3'
import {
  MAINNET_CHAIN_ID
} from '@/config'

const web3 = new Web3()

const CheckProvablyFairModal = (props) => {

  const { closeModal } = useConfirmationModal()

  const inputClass = "w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-white placeholder-gray-500"
  const buttonClass = "w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg disabled:bg-gray-600 disabled:cursor-not-allowed transition duration-200 flex items-center justify-center space-x-2"
  const [ random, setRandom ] = useState(``)
  const [ randomHash, setRandomHash ] = useState(false)
  const calcRandomHash = () => {
    const hash = web3.utils.keccak256(random)
    setRandomHash(hash)
  }
  return (
    <>
      <div>
        <code>
          {`hash = keccak256(random)`}
        </code>
      </div>
      <div>
        <span>Random Number (0x....):</span>
        <input type="text"
          value={random} onChange={(e) => { setRandom(e.target.value) }}
          className={inputClass} />
      </div>
      <div className="pt-2">
        <button onClick={calcRandomHash} className={buttonClass}>Generete hash</button>
      </div>
      {randomHash && (
        <div>
          <span>Random Hash:</span>
          <input type="text"
            value={randomHash} readOnly={true}
            className={inputClass} />
        </div>
      )}
      <div className="pt-2">
        <button
          onClick={() => { closeModal('CHECK_PROVABLY') }}
          className={`w-full py-3 px-4 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition duration-200`}
        >
          Close
        </button>
      </div>
    </>
  );
};

export default CheckProvablyFairModal;