
import { useEffect, useState, Component } from "react"

import { useInjectedWeb3 } from '@/web3/InjectedWeb3Provider'
import { useMarkDown } from '@/contexts/MarkDownContext'

import ConnectWalletButton from '@/components/ConnectWalletButton'

import Form from '@/components/bridge/Form/'
import MarkDownBlock from '@/components/MarkDownBlock'
import LoadingPlaceholder from '@/components/LoadingPlaceholder'

import UserPanel from '@/components/flipgame/UserPanel'
import Coin from '@/components/flipgame/Coin'
import GameStart from '@/components/flipgame/GameStart'

export default function Home(props) {
  const {
    gotoPage,
    params,
    on404
  } = props
  
  /*
  const { getFile } = useMarkDown()

  const [ topBlockLoading, setTopBlockLoading ] = useState(true)
  const [ topBlockContent, setTopBlockContent ] = useState(false)

  const [ bottomBlockLoading, setBottomBlockLoading ] = useState(true)
  const [ bottomBlockContent, setBottomBlockContent ] = useState(false)
  
  useEffect(() => {
    getFile('./topBlock.md').then((content) => {
      setTopBlockContent(content)
    }).catch((err) => {}).finally(() => { setTopBlockLoading(false) })
    getFile('./bottomBlock.md').then((content) => {
      setBottomBlockContent(content)
    }).catch((err) => {}).finally(() => { setBottomBlockLoading(false) })
  }, [])
  */

  const {
    isConnected,
    injectedAccount
  } = useInjectedWeb3()

  /* --- */
  const [balance, setBalance] = useState<number>(1250);

  const handleDeposit = () => {
    setBalance((prev) => prev + 100);
    alert('Вы пополнили депозит на 100 TOKEN');
  };

  const handleWithdraw = () => {
    if (balance >= 100) {
      setBalance((prev) => prev - 100);
      alert('Вы вывели 100 TOKEN');
    } else {
      alert('Недостаточно средств для вывода');
    }
  };
  /* --- */

  return (
    <>
      {/*
      {(topBlockLoading || topBlockContent !== false) && (
        <div className="w-full pt-8">
          {topBlockLoading ? (
            <div 
              className="w-full mx-auto lg:max-w-6xl bg-gray-800 rounded-lg shadow-lg" 
              style={{ paddingBottom: '1px' }}
            >
              <LoadingPlaceholder height={`64px`} darkMode />
            </div>
          ) : (
            <div 
              className="bg-gray-800 rounded-lg shadow-lg p-6 w-full mx-auto lg:max-w-6xl markdown-container text-gray-100"
              style={{ paddingBottom: '1px' }}
            >
              <MarkDownBlock markdown={topBlockContent} />
            </div>
          )}
        </div>
      )}
      */}
      
      <div className="min-h-screen flex items-center justify-center p-4">
        <GameStart balance={100} onFlip={() => {}} />
      </div>
{/*
      {(bottomBlockLoading || bottomBlockContent !== false) && (
        <div className="w-full pt-2">
          {bottomBlockLoading ? (
            <div className="w-full mx-auto lg:max-w-6xl bg-gray-800 rounded-lg shadow-lg" style={{paddingBottom: '1px'}}>
              <LoadingPlaceholder height={`64px`} />
            </div>
          ) : (
            <div className="bg-gray-800 rounded-lg shadow-lg p-6 w-full mx-auto lg:max-w-6xl markdown-container text-gray-100" style={{paddingBottom: '1px'}}>
              <MarkDownBlock markdown={bottomBlockContent} />
            </div>
          )}
        </div>
      )}
      */}
    </>
  )
}
