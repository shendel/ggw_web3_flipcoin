import { ConnectWalletButton } from '@/web3/ConnectWalletButton'
import { DisconnectWalletButton } from '@/web3/DisconnectWalletButton'

import React, { useState,useEffect } from "react";
import { useInjectedWeb3 } from '@/web3/InjectedWeb3Provider'
import { fromWei } from '@/helpers/wei'

import Button from '@/components/ui/Button'

const formatUrl = (href) => {
  if (href.substr(0,1) == '/') return `#${href}`
  return href
}

import { MAINNET_CHAIN_ID } from '@/config'
import { GET_CHAIN_BYID } from '@/web3/chains'

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  
  const {
    injectedAccount,
    injectedChainId,
    balance
  } = useInjectedWeb3()
  
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  const chainInfo = GET_CHAIN_BYID(MAINNET_CHAIN_ID)
  console.log('>>> chainInfo', chainInfo)
  
  const isOwner = false

  const menuItems = [
    {
      title: 'Home',
      url: '#/'
    },
    /*
    {
      title: 'About',
      url: '#/about'
    },
    */
    ...((isOwner) ? [{
      title: 'Admin',
      url: '#/admin'
    }] : [])
  ]
  
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const disconnectWallet = () => {
    setIsMenuOpen(false); // Закрываем меню после отключения
  };
  
  const walletButtonClass = `flex items-center gap-2 px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg disabled:bg-gray-600 disabled:cursor-not-allowed transition duration-200 flex items-center justify-center space-x-2`
  return (
    <header
      className={`main-header shadow-md fixed top-0 left-0 right-0 z-50 ${scrolled ? 'scrolled' : ''}`}
    >
      {/* Десктопная версия меню */}
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        {/* Логотип */}
        <div className="text-2xl font-bold text-white text-nowrap pr-8">
          {`GGWorld FlipGame`}
        </div>
        {/* Мобильная версия (гамбургер-меню) */}
        <div className="md:hidden">
          <button
            onClick={toggleMenu}
            className="focus:outline-none"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-6 w-6 text-white transition-transform ${
                isMenuOpen ? 'rotate-90' : ''
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>

        {/* Десктопная версия меню */}
        <nav className="flex hidden md:flex item-center gap-4 justify-between w-full">
          <div className="flex items-center gap-4">
            {menuItems.map((item, key) => {
              const { title, url, blank} = item
              return (
                <a
                  key={key}
                  href={formatUrl(url)}
                  className="text-white hover:text-blue-500 font-bold"
                  {...((blank) ? {target:'_blank'} : {})}
                >
                  {title}
                </a>
              )
            })}
          </div>
          {/* Отображение кошелька */}
          <div className="relative">
            <ConnectWalletButton
              connectView={(isConnecting, openConnectModal) => {
                return (
                  <button
                    disabled={isConnecting}
                    onClick={openConnectModal}
                    className={walletButtonClass}
                  >
                    Connect Wallet
                  </button>
                )
              }}
              connectedView={(walletAddress) => {
                return (
                  <button
                    onClick={toggleMenu}
                    className={walletButtonClass}
                  >
                    <span>{`${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`}</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 text-while"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                )
              }}
              wrongChainView={(openChainModal) => {
                return (
                  <button
                    onClick={openChainModal}
                    className={walletButtonClass}
                  >
                    Switch chain
                  </button>
                )
              }}
            />
            {/* Выпадающее меню */}
            {isMenuOpen && (
              <div
                className="absolute p-4 right-0 mt-2 py-2 w-96 bg-slate-50 border border-gray-200 rounded shadow-lg z-10"
                onMouseLeave={() => setIsMenuOpen(false)}
              >
                <div className="py-2 text-gray-700 font-bold">
                  <p className="font-bold">Wallet Address:</p>
                  <p className="truncate text-sm text-blue-600">
                    {injectedAccount}
                  </p>
                </div>
                <div className="py-2 text-gray-700 font-bold">
                  <p className="font-bold">Balance:</p>
                  <p className="text-sm text-blue-500">{fromWei(balance)} {chainInfo.nativeCurrency.symbol}</p>
                </div>
                <DisconnectWalletButton 
                  view={(handleDisconnect) => {
                    return (
                      <Button
                        fullWidth={true}
                        color={`red`}
                        isBold={true}
                        onClick={() => {
                          handleDisconnect()
                          setIsMenuOpen(false)
                        }}
                      >
                        Disconnect Wallet
                      </Button>
                    )
                  }}
                />
              </div>
            )}
          </div>
        </nav>
      </div>

      {/* Выпадающее мобильное меню */}
      <div
        className={`mobile-header fixed inset-y-0 left-0 w-full md:hidden transform transition-transform duration-300 ease-in-out ${
          isMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } z-50 shadow-lg`}
      >
        <div className="p-6 h-full flex flex-col justify-between">
          {/* Верхняя часть меню */}
          <div>
            {/* Закрыть меню */}
            <button
              onClick={toggleMenu}
              className="absolute top-4 right-4 focus:outline-none text-white"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
            <div
              className="text-2xl font-bold text-white text-nowrap pr-8"
              style={{
                marginTop: '-0.75rem',
                marginLeft: '-0.75rem'
              }}
            >
              {`GGWorld FlipGame`}
            </div>
            {/* Ссылки меню */}
            <ul className="mt-8 space-y-4">
              {menuItems.map((item, key) => {
                const { title, url, blank } = item
                return (
                  <li key={key}>
                    <a
                      href={formatUrl(url)}
                      className="block text-white hover:text-blue-500 font-bold"
                      onClick={toggleMenu}
                      {...((blank) ? { target: '_blank' } : {})}
                    >
                      {title}
                    </a>
                  </li>
                )
              })}
            </ul>
          </div>

          {/* Нижняя часть меню */}
          <div>
            <ConnectWalletButton
              connectView={(isConnecting, openConnectModal) => {
                return (
                  <Button
                    fullWidth={true}
                    isDisabled={isConnecting}
                    onClick={openConnectModal}
                  >
                    Connect Wallet
                  </Button>
                )
              }}
              connectedView={(walletAddress) => {
                return (
                  <Button
                    fullWidth={true}
                  >
                    {`${walletAddress.slice(0, 8)}...${walletAddress.slice(-6)}`}
                  </Button>
                )
              }}
              wrongChainView={(openChainModal) => {
                return (
                  <Button
                    fullWidth={true}
                    onClick={openChainModal}
                  >
                    Switch chain
                  </Button>
                )
              }}
            />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
