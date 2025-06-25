import React, { useState, useEffect } from 'react';
import Coin from './Coin'
import DepositModal from './DepositModal'
import WithdrawModal from './WithdrawModal'
import WinningStars from './WinningStars'
import GameHistoryTable from './GameHistoryTable'

import ConnectWalletButton from '@/components/ConnectWalletButton'

import fetchPlayerInfo from '@/helpers_flipgame/fetchPlayerInfo'
import { useInjectedWeb3 } from '@/web3/InjectedWeb3Provider'
import { useConfirmationModal } from '@/components/ConfirmationModal'
import { useNotification } from "@/contexts/NotificationContext";
import { getTransactionLink, getShortTxHash } from '@/helpers/etherscan'
import approveToken from '@/helpers/approveToken'
import depositTokens from '@/helpers_flipgame/depositTokens'
import withdrawTokens from '@/helpers_flipgame/withdrawTokens'
import fetchGameInfo from '@/helpers_flipgame/fetchGameInfo'
import fetchPlayerGames from '@/helpers_flipgame/fetchPlayerGames'
import fetchSummaryGameInfo from '@/helpers_flipgame/fetchSummaryGameInfo'

import playGame from '@/helpers_flipgame/playGame'
import BigNumber from "bignumber.js"
import { GAME_STATUS } from '@/helpers_flipgame/constants'
console.log('>> GAME_STATUS', GAME_STATUS)
import {
  MAINNET_CHAIN_ID,
  GAME_CONTRACT
} from '@/config'

import { fromWei, toWei } from '@/helpers/wei'

import SwitchChainButton from '@/components/flipgame/SwitchChainButton'



const GameStart: React.FC<GameStartProps> = (props) => {
  const { balance, onFlip } = props

  const [ bet, setBet ] = useState<number | string>(''); // может быть числом или пустой строкой
  const [ chosenSide, setChosenSide ] = useState<boolean | null>(null); // true = heads, false = tails
  const [ isFlipping, setIsFlipping ] = useState(false);
  const [ isStartingGame, setIsStaringGame ] = useState(false)
  
  const [ playerDeposit, setPlayerDeposit ] = useState(0)
  const [ tokenAddress, setTokenAddress ] = useState(``)
  const [ tokenSymbol, setTokenSymbol ] = useState(`...`)
  const [ tokenDecimals, setTokenDecimals ] = useState(18)
  const [ playerBalance, setPlayerBalance ] = useState(0)
  const [ playerAllowance, setPlayerAllowance ] = useState(0)
  
  const [ totalGameInfo, setTotalGameInfo ] = useState(false)
  const [ gameBank, setGameBank ] = useState('0')
  
  useEffect(() => {
    fetchSummaryGameInfo({
      chainId: MAINNET_CHAIN_ID,
      address: GAME_CONTRACT,
    }).then((answer) => {
      setTotalGameInfo(answer)
      setGameBank(answer.gameBank)
      console.log('>>> TOTAL GAME INFO', answer)
    }).catch((err) => {})
  }, [ MAINNET_CHAIN_ID, GAME_CONTRACT ])

  const {
    isConnected,
    injectedWeb3,
    injectedAccount,
    injectedChainId,
    switchNetwork,
    isSwitchingNetwork,
  } = useInjectedWeb3()

  const { addNotification } = useNotification()
  const {
    openModal,
    closeModal,
  } = useConfirmationModal()

  const [ isFetchingUserInfo, setIsFetchingUserInfo ] = useState(true)
  const [ needUpdateUser, setNeedUpdateUser ] = useState(true)
  
  const [ gameId, setGameId ] = useState(0)
  const [ gameInfo, setGameInfo ] = useState(false)
  const [ gameIsFinished, setGameIsFinished ] = useState(true)
  const [ gameIsRunning, setGameIsRunning ] = useState(false)
  const [ gameWaitCounter, setGameWaitCounter ] = useState(0)
  
  useEffect(() => {
    const poll = setInterval(async () => {
      if (gameId && gameIsRunning) {
        // Game started - fetch status
        fetchGameInfo({
          address: GAME_CONTRACT,
          chainId: MAINNET_CHAIN_ID,
          gameId
        }).then((answer) => {
          const {
            gameInfo
          } = answer
          if (gameInfo.status != GAME_STATUS.PENDING) {
            clearInterval(poll)
            setGameInfo(gameInfo)
            setGameIsFinished(true)
            setGameIsRunning(false)
          }
        }).catch((err) => {
          console.log('>> err', err)
        })
      } else {
        console.log('>>> Flipped!!')
        clearInterval(poll)
        if (gameId && gameIsFinished && !gameIsRunning && gameInfo) {
          setIsFlipping(false)
          setNeedUpdateUser(true)
          const _playerGames = [...playerGames]
          _playerGames[0] = gameInfo
          setPlayerGames(_playerGames)
          if (gameInfo.status == GAME_STATUS.WON) {
            console.log('>>> WON!!!')
          }
          if (gameInfo.status == GAME_STATUS.LOST) {
            console.log('>>> LOST!!!')
          }
        }
      }
    }, 1000);

    return () => clearInterval(poll);
    
  }, [ gameId, gameIsFinished, gameIsRunning])

  const [ playerGames, setPlayerGames ] = useState([])
  const [ needUpdateGamesList, setNeedUpdateGamesList ] = useState(true)
  useEffect(() => {
    if (isConnected && injectedAccount && needUpdateGamesList) {
      setNeedUpdateGamesList(false)
      console.log('>>> fetching games')
      fetchPlayerGames({
        playerAddress: injectedAccount,
        address: GAME_CONTRACT,
        chainId: MAINNET_CHAIN_ID,
        offset: 0,
        limit: 20
      }).then((answer) => {
        const {
          games
        } = answer
        setPlayerGames(games)
      }).catch((err) => {})
    }
  }, [ isConnected, injectedAccount, needUpdateGamesList ])
  
  useEffect(() => {
    if (isConnected && injectedAccount) {
      setNeedUpdateUser(true)
      setNeedUpdateGamesList(true)
    }
  }, [ isConnected, injectedAccount ])
  
  useEffect(() => {
    if (isConnected && injectedAccount && needUpdateUser) {
      setIsFetchingUserInfo(true)
      setNeedUpdateUser(false)
      fetchPlayerInfo({
        playerAddress: injectedAccount,
        address: GAME_CONTRACT,
        chainId: MAINNET_CHAIN_ID
      }).then((answer) => {
        console.log(answer)
        const {
          playerDeposit: {
            balance
          },
          tokenAddress,
          gameBank,
          tokenInfo: {
            userAllowance,
            userBalance,
            symbol,
            decimals
          }
        } = answer
        setIsFetchingUserInfo(false)
        setPlayerDeposit(balance)
        setPlayerAllowance(userAllowance)
        setPlayerBalance(userBalance)
        setTokenAddress(tokenAddress)
        setTokenDecimals(decimals)
        setTokenSymbol(symbol)
        setGameBank(gameBank)
      }).catch((err) => {
        console.log('>err', err)
        setIsFetchingUserInfo(false)
      })
    }
  }, [ isConnected, injectedAccount, needUpdateUser ])
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || (!isNaN(Number(value)) && Number(value) >= 0)) {
      setBet(value);
    }
  };

  useEffect(() => {
    setGameInfo(false)
  }, [ bet, chosenSide ])

  const handleMaxClick = () => {
    setBet(
      fromWei(
        new BigNumber(playerDeposit).isLessThanOrEqualTo(totalGameInfo.maxBet)
        ? playerDeposit
        : totalGameInfo.maxBet,
        tokenDecimals
      )
    );
  };

  const handleFlipClick = () => {
    const betValue = Number(bet);
    if (betValue > 0 && new BigNumber(toWei(betValue, tokenDecimals)).isLessThanOrEqualTo(playerDeposit) && chosenSide !== null) {
      setIsFlipping(true);
    }
  };
  
  const handleApprove = (
    amount: number,
    setLoading: (loading: boolean) => void,
    setAllowance: (newAllowance) => void
  ) => {
    setLoading(true)
    addNotification('info', `Approving ${tokenSymbol}. Confirm transaction`)
    approveToken({
      activeWallet: injectedAccount,
      activeWeb3: injectedWeb3,
      tokenAddress: tokenAddress,
      approveFor: GAME_CONTRACT,
      weiAmount: toWei(amount, tokenDecimals),
      onTrx: (txHash) => {
        addNotification('info', 'Approving transaction', getTransactionLink(MAINNET_CHAIN_ID, txHash), getShortTxHash(txHash))
      },
      onSuccess: () => {
        addNotification('success', `Token ${tokenSymbol} successfull approved`)
        setLoading(false)
        setPlayerAllowance(toWei(amount, tokenDecimals))
        setAllowance(toWei(amount, tokenDecimals))
      },
      onError: () => {
        addNotification('error', 'Fail approving')
        setLoading(false)
      }
    }).catch((err) => {})
  };

  const handleDeposit = (amount: number, setLoading: (loading: boolean) => void) => {
    setLoading(true);
    addNotification('info', 'Depositing. Confirm transaction')
    depositTokens({
      activeWeb3: injectedWeb3,
      address: GAME_CONTRACT,
      amount: `0x` + new BigNumber(toWei(amount, tokenDecimals)).toString(16),
      onTrx: (txHash) => {
        addNotification('info', 'Deposit transaction', getTransactionLink(MAINNET_CHAIN_ID, txHash), getShortTxHash(txHash))
      },
      onSuccess: () => {
        addNotification('success', `Successfull deposited`)
        setLoading(false)
        setNeedUpdateUser(true)
        closeModal('DEPOSIT_TOKENS')
      },
      onError: () => {
        addNotification('error', 'Fail depositing')
        setLoading(false)
      }
    }).catch((err) => {})
  }
  
  const handleWithdraw = (amount: number, setLoading: (loading: boolean) => void) => {
    setLoading(true);
    addNotification('info', 'Withdrawing deposit. Confirm transaction')
    withdrawTokens({
      activeWeb3: injectedWeb3,
      address: GAME_CONTRACT,
      amount: `0x` + new BigNumber(toWei(amount, tokenDecimals)).toString(16),
      onTrx: (txHash) => {
        addNotification('info', 'Withdraw transaction', getTransactionLink(MAINNET_CHAIN_ID, txHash), getShortTxHash(txHash))
      },
      onSuccess: () => {
        addNotification('success', `Successfull withdrawed`)
        setLoading(false)
        setNeedUpdateUser(true)
        closeModal('WITHDRAW_TOKENS')
      },
      onError: () => {
        addNotification('error', 'Fail withdraw')
        setLoading(false)
      }
    }).catch((err) => {})
  }
  
  const handlePlayGame = () => {
    addNotification('info', 'Starting game round. Confirm transaction')
    setIsStaringGame(true)
    setGameInfo(false)
    playGame({
      activeWeb3: injectedWeb3,
      address: GAME_CONTRACT,
      betAmount: `0x` + new BigNumber(toWei(bet, tokenDecimals)).toString(16),
      chosenSide,
      onTrx: (txHash) => {
        addNotification('info', 'Start game round transaction', getTransactionLink(MAINNET_CHAIN_ID, txHash), getShortTxHash(txHash))
        setIsFlipping(true)
        setPlayerGames([
          {
            amount: toWei(bet, tokenDecimals),
            chosenSide,
            status: 0
          },
          ...playerGames
        ])
      },
      onSuccess: (txInfo) => {
        const {
          events: {
            GameRequested: {
              returnValues: {
                gameId
              }
            }
          }
        } = txInfo
        addNotification('success', `Coin successfull flipping. Game ID ${gameId}`)
        setIsStaringGame(false)
        
        setNeedUpdateUser(true)
        console.log('>>> gameId', gameId)
        setGameId(gameId)
        setGameIsRunning(true)
        setGameIsFinished(false)

      },
      onError: () => {}
    }).catch((err) => {
      addNotification('error', 'Fail depositing')
      setIsStaringGame(false)
    })
  }
  
  const onDeposit = () => {
    openModal({
      title: `Deposit replenishment`,
      hideBottomButtons: true,
      fullWidth: true,
      id: 'DEPOSIT_TOKENS',
      onClose: (data) => {
        
      },
      content: (
        <DepositModal
          userBalance={playerBalance}
          userAllowance={playerAllowance}
          tokenDecimals={tokenDecimals}
          tokenSymbol={tokenSymbol}
          onApprove={handleApprove}
          onDeposit={handleDeposit}
          onCancel={() => {
            closeModal('DEPOSIT_TOKENS')
          }}
        />
      )
    })
  }
  const onWithdraw = () => {
    openModal({
      title: `Withdraw deposit`,
      hideBottomButtons: true,
      fullWidth: true,
      id: 'WITHDRAW_TOKENS',
      onClose: (data) => {
        
      },
      content: (
        <WithdrawModal
          userBalance={playerDeposit}
          tokenDecimals={tokenDecimals}
          tokenSymbol={tokenSymbol}
          onWithdraw={handleWithdraw}
          onCancel={() => {
            closeModal('WITHDRAW_TOKENS')
          }}
        />
      )
    })
  }
  
  if (!totalGameInfo) return null
  
  const potentialWin = Number(bet) > 0
    ? fromWei(
      new BigNumber(
        toWei(bet, totalGameInfo.tokenInfo.decimals)
      ).multipliedBy(
        totalGameInfo.winMultiplier
      ).dividedBy( toWei( 1 )).toString(),
      totalGameInfo.tokenInfo.decimals
    )
    : 0;

  const isWon = gameInfo?.status === GAME_STATUS.WON;
  const isLost = gameInfo?.status === GAME_STATUS.LOST;
  
  const isWrongChain = (injectedChainId !== MAINNET_CHAIN_ID) ? true : false
  const { tokenInfo } = totalGameInfo

  const betIsOk = !(!bet
    || new BigNumber(toWei(bet, tokenInfo.decimals)).isLessThan(totalGameInfo.minBet)
    || new BigNumber(toWei(bet, tokenInfo.decimals)).isGreaterThan(playerDeposit)
    || new BigNumber(toWei(bet, tokenInfo.decimals)).isGreaterThan(totalGameInfo.maxBet)
  )

  let badBetLabel = false
  if (!bet) badBetLabel = 'Make your Bet'
  if (new BigNumber(toWei(bet, tokenInfo.decimals)).isLessThan(totalGameInfo.minBet)) badBetLabel = 'The Bet too Low'
  if (new BigNumber(toWei(bet, tokenInfo.decimals)).isGreaterThan(totalGameInfo.maxBet)) badBetLabel = 'The Bet to High'
  if (new BigNumber(toWei(bet, tokenInfo.decimals)).isGreaterThan(playerDeposit)) badBetLabel = 'Not enough balance at deposit'

  return (
    <>
      <div className="max-w-2xl w-full mx-auto">
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700 max-w-2xl mx-auto mb-4">
          <h2 className="text-xl font-bold text-white mb-4 text-center">{`Game Bank`}</h2>
          {/* Баланс банка */}
          <div className="mb-5">
            <p className="text-7xl font-bold text-green-400 text-center">
              {fromWei(gameBank, tokenInfo.decimals)}
            </p>
            <p className="text-xl font-bold text-blue-400 text-center">{tokenInfo.symbol}</p>
          </div>
        </div>
        <div className="bg-gray-900 rounded-xl shadow-lg p-6 max-w-lg w-full mx-auto border border-gray-700">
          {/* Блок депозита */}
          {!injectedAccount ? (
            <ConnectWalletButton />
          ) : (
            <div className="flex flex-col items-center justify-center max-w-xs mx-auto p-6">
              <h2 className="text-lg font-semibold text-gray-100 mb-4">
                {`Your Deposit balance`}
              </h2>
              <p className="text-3xl font-bold text-indigo-400 mb-6">
                {fromWei(playerDeposit, tokenInfo.decimals)}
                {` `}
                <span className="text-sm font-normal text-gray-400">{tokenInfo.symbol}</span>
              </p>
              <div className="flex space-x-4 w-full">
                <button
                  onClick={onDeposit}
                  className="flex-1 py-2 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition duration-200"
                >
                  {`Deposit`}
                </button>
                <button
                  onClick={onWithdraw}
                  className="flex-1 py-2 px-4 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition duration-200"
                >
                  {`Withdraw`}
                </button>
              </div>
            </div>
          )}

          {/* Поле ввода ставки */}
          <div className="mb-4">
            <label htmlFor="bet" className="block text-sm font-medium text-gray-300 mb-1">
              {`Your Bet (Min: ${fromWei(totalGameInfo.minBet, tokenInfo.decimals)}, Max: ${fromWei(totalGameInfo.maxBet, tokenInfo.decimals)})`}
            </label>
            <div className="flex items-center">
              <input
                id="bet"
                type="number"
                min="0"
                value={bet}
                onChange={handleInputChange}
                disabled={isFlipping || !injectedAccount}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-white placeholder-gray-500"
                placeholder="Enter the amount"
              />
              <button
                onClick={handleMaxClick}
                type="button"
                disabled={isFlipping || !injectedAccount}
                className="ml-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium text-white disabled:bg-gray-800 disabled:text-gray-500"
              >
                {`MAX`}
              </button>
            </div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              
            </label>
          </div>

          {/* Выбор стороны монеты */}
          <div className="mb-6">
            <p className="block text-sm font-medium text-gray-300 mb-2">
              {`Choose your side of the coin`}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setChosenSide(true)
                  setGameInfo(false)
                }}
                disabled={isFlipping || !injectedAccount}
                className={`py-3 px-4 rounded-lg border flex items-center justify-center space-x-2 transition ${
                  chosenSide === true
                    ? 'border-indigo-500 bg-indigo-900/40 text-indigo-300'
                    : 'border-gray-600 bg-gray-800 hover:bg-gray-700 text-gray-300'
                } ${(isFlipping || !injectedAccount) ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <img src={`/assets/coinHeadsIcon.png`} />
                <span>{`Heads`}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setChosenSide(false)
                  setGameInfo(false)
                }}
                disabled={isFlipping || !injectedAccount}
                className={`py-3 px-4 rounded-lg border flex items-center justify-center space-x-2 transition ${
                  chosenSide === false
                    ? 'border-indigo-500 bg-indigo-900/40 text-indigo-300'
                    : 'border-gray-600 bg-gray-800 hover:bg-gray-700 text-gray-300'
                } ${(isFlipping || !injectedAccount) ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <img src={`/assets/coinTailsIcon.png`} />
                <span>{`Tails`}</span>
              </button>
            </div>
          </div>

          {/* Потенциальный выигрыш */}
          <div className="mb-6">
            <p className="text-sm text-gray-400">{`You will receive if you win:`}</p>
            <p className="text-xl font-semibold text-green-400">{potentialWin.toLocaleString()} {tokenInfo.symbol}</p>
          </div>
          <div className="pb-6 relative">
            <Coin
              isHeads={(gameInfo && gameInfo.status == GAME_STATUS.LOST) ? !chosenSide : chosenSide}
              isFlipping={isFlipping}
            />

            {/* Анимация звёзд при выигрыше */}
            {isWon && <WinningStars />}

            {/* Сообщение поверх монетки */}
            {isWon && (
              <h2
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-4xl font-extrabold text-green-500 animate-scale-in z-10 pointer-events-none"
                aria-label="You won!"
                style={{marginTop: '-0.7rem'}}
              >
                WON!!!
              </h2>
            )}

            {isLost && (
              <h2
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-4xl font-extrabold text-red-500 animate-scale-in z-10 pointer-events-none"
                aria-label="You lost"
                style={{marginTop: '-0.7rem'}}
              >
                LOST :(
              </h2>
            )}
          </div>
          {!injectedAccount ? (
            <>
              <ConnectWalletButton />
            </>
          ) : (
            <>
              {isWrongChain ? (
                <SwitchChainButton />
              ) : (
                <button
                  onClick={handlePlayGame}
                  disabled={!betIsOk || chosenSide === null || isFlipping || isStartingGame}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg disabled:bg-gray-600 disabled:cursor-not-allowed transition duration-200 flex items-center justify-center space-x-2"
                >
                  {isFlipping || isStartingGame ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      <span>{(isStartingGame) ? `Starting game round` : `Waiting for the result...`}</span>
                    </>
                  ) : (
                    <span>
                      {!betIsOk
                        ? badBetLabel
                        : chosenSide === null
                          ? `Choose your side of the coin`
                          : `Flip Coin`
                      }
                    </span>
                  )}
                </button>
              )}
            </>
          )}
        </div>
        {injectedAccount && (
          <div className="bg-gray-900 rounded-xl shadow-lg mt-6 p-6 max-w-lg w-full mx-auto border border-gray-700">
            <h2 className="text-xl font-semibold mb-4 text-center">{`History of your games`}</h2>
            <GameHistoryTable games={playerGames} tokenDecimals={tokenDecimals} winMultiplier={totalGameInfo.winMultiplier} />
          </div>
        )}
      </div>
    </>
  );
};

export default GameStart;