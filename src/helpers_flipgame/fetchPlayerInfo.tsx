import FlipGameJson from "@/abi/FlipCoinGame.json"
import Web3 from 'web3'
import { Interface as AbiInterface } from '@ethersproject/abi'
import { GET_CHAIN_RPC } from '@/web3/chains'
import getMultiCall, { getMultiCallAddress, getMultiCallInterface }from '@/web3/getMultiCall'

import { callMulticall } from '@/helpers/callMulticall'
import Web3ObjectToArray from "@/helpers/Web3ObjectToArray"
import { fromWei } from '@/helpers/wei'

const fetchPlayerInfo = (options) => {
  const {
    playerAddress,
    address,
    chainId,
  } = {
    ...options
  }

  return new Promise((resolve, reject) => {
    const FlipGameAbi = FlipGameJson.abi

    const multicall = getMultiCall(chainId)
    const abiI = new AbiInterface(FlipGameAbi)

    callMulticall({
      multicall,
      target: address,
      encoder: abiI,
      calls: {
        playerDeposit: {
          func: 'players', args: [ playerAddress ]
        },
        tokenAddress: {
          func: 'token'
        },
        tokenInfo: {
          func: 'getTokenInfo', args: [ playerAddress ]
        },
        gameBank: {
          func: 'gameBank'
        },
        playerBalance: {
          func: 'getDepositOf', args: [ playerAddress ]
        },
      }
    }).then((mcAnswer) => {
    console.log('>>> fetchPlayerInfo', mcAnswer)
      const { playerDeposit, playerBalance } = mcAnswer
      playerDeposit.balance = playerBalance
      resolve({
        chainId,
        address,
        playerAddress,
        ...mcAnswer,
        playerDeposit
      })

    }).catch((err) => {
      console.log('>>> Fail fetch all info', err)
      reject(err)
    })
  })
}

export default fetchPlayerInfo