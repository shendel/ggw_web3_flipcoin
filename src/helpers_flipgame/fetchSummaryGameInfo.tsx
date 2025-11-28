import FlipGameJson from "@/abi/FlipCoinGame.json"
import Web3 from 'web3'
import { Interface as AbiInterface } from '@ethersproject/abi'
import { GET_CHAIN_RPC } from '@/web3/chains'
import getMultiCall, { getMultiCallAddress, getMultiCallInterface }from '@/web3/getMultiCall'

import { callMulticall } from '@/helpers/callMulticall'
import Web3ObjectToArray from "@/helpers/Web3ObjectToArray"
import { fromWei } from '@/helpers/wei'

const fetchSummaryGameInfo = (options) => {
  const {
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
        tokenInfo:              { func: 'getTokenInfo', args: [ '0x0000000000000000000000000000000000000000' ] },
        owner:                  { func: 'owner' },
        tokenAddress:           { func: 'token' },
        playersCount:           { func: 'playersCount' },
        gamesCount:             { func: 'gamesCount' },
        wonGamesCount:          { func: 'wonGamesCount' },
        lostGamesCount:         { func: 'lostGamesCount' },
        totalWonAmount:         { func: 'totalWonAmount' },
        totalLostAmount:        { func: 'totalLostAmount' },
        gameBank:               { func: 'gameBank' },
        winMultiplier:          { func: 'winMultiplier' },
        minBet:                 { func: 'minBet' },
        maxBet:                 { func: 'maxBet' }
      }
    }).then((mcAnswer) => {
      
      resolve({
        chainId,
        address,
        ...mcAnswer,
      })

    }).catch((err) => {
      console.log('>>> Fail fetch all info', err)
      reject(err)
    })
  })
}

export default fetchSummaryGameInfo