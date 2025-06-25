import FlipGameJson from "@/abi/FlipCoinGame.json"
import callContractMethod from '@/helpers/callContractMethod'

const playGame = (options) => {
  const {
    activeWeb3,
    address,
    betAmount,
    chosenSide,
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
    args: [
      betAmount,
      chosenSide
    ],
    calcGas,
    onTrx,
    onSuccess,
    onError,
    onFinally
  })
}


export default playGame