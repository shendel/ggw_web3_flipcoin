import FlipGameJson from "@/abi/FlipCoinGame.json"
import callContractMethod from '@/helpers/callContractMethod'

const playGame = (options) => {
  const {
    activeWeb3,
    address,
    betAmount,
    chosenSide,
    serverHash,
    calcGas,
    onTrx = (txHash) => {},
    onSuccess = () => {},
    onError = () => {},
    onFinally = () => {}
  } = options
  
  const contract = new activeWeb3.eth.Contract(FlipGameJson.abi, address)
  
  return callContractMethod({
    activeWeb3,
    contract,
    method: 'play',
    ownGas: 1000_000,
    args: [
      betAmount,
      chosenSide,
      serverHash,
    ],
    calcGas,
    onTrx,
    onSuccess,
    onError,
    onFinally
  })
}


export default playGame