import React, { useState } from 'react';
import { fromWei } from '@/helpers/wei'
import { getAddressLink, getShortAddress } from '@/helpers/etherscan'

import { GAME_STATUS } from '@/helpers_flipgame/constants'

const AdminGamesTable = (props) => {
  const {
    isPlayerGames,
    games,
    itemsPerPage = 1,
    gamesCount,
    currentPage,
    tokenInfo,
    onPageNext = () => {},
    onPagePrev = () => {},
    chainId,
    gotoPage
  } = props


  const totalPages = Math.ceil(gamesCount / itemsPerPage);

  const formatTokens = (amount) => {
    return `${fromWei(amount, tokenInfo.decimals)}`
  }
  return (
    <div className="overflow-hidden rounded-lg shadow-md bg-gray-800 text-white">
      <div className="overflow-x-auto">
        <table className="min-w-full table-auto">
          <thead className="bg-gray-700">
            <tr className="text-sm font-semibold">
              <th className="px-4 py-3">
                {`ID`}
              </th>
              {!isPlayerGames && (
                <th className="px-4 py-3 text-left">
                  {`Player address`}
                </th>
              )}
              <th className="px-4 py-3 text-right">
                {`Bet (${tokenInfo.symbol})`}
              </th>
              <th className="px-4 py-3">
                {`Chosen side`}
              </th>
              {/*
              <th className="px-4 py-3">
                {`Win side`}
              </th>
              */}
              <th className="px-4 py-3">
                {`Status`}
              </th>
              <th className="px-4 py-3 text-right">
                {`Summary (${tokenInfo.symbol})`}
              </th>
              <th className="px-4 py-3">
                {`Date`}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-600">
            
            {games.map((game, index) => {
              const {
                gameId,
                player: playerAddress,
                amount: betAmount,
                wonAmount,
                chosenSide, // true = heads, false = tails
                timestamp,
                status
              } = game
              
              return (
                <tr key={gameId} className="hover:bg-gray-700 transition-colors">
                  <td className="px-4 py-3 text-sm truncate max-w-xs font-semibold">
                    {gameId}
                  </td>
                  {!isPlayerGames && (
                    <td className="px-4 py-3 text-sm truncate max-w-xs font-semibold">
                      <a
                        onClick={() => {
                          gotoPage(`/admin/playergames/${playerAddress}`)
                        }}
                        target="_blank"
                        className="text-blue-300 cursor-pointer"
                      >
                        {getShortAddress(playerAddress, 8)}
                      </a>
                    </td>
                  )}
                  <td className="px-4 py-3 text-sm text-right font-semibold">
                    {formatTokens(betAmount)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right">
                    {chosenSide ? (
                      <div className="flex items-center justify-center">
                        <img src="/assets/coinHeadsIcon.png" className="w-5 h-5"/>
                        <span className="font-bold px-2">{`Heads`}</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center">
                        <img src="/assets/coinTailsIcon.png" className="w-5 h-5" />
                        <span className="font-bold px-2">{`Tails`}</span>
                      </div>
                    )}
                  </td>
                  {/*
                  <td className="px-4 py-3 text-sm text-right">
                    {status !== GAME_STATUS.PENDING && (
                      <>
                        {chosenSide? (
                          <div className="flex items-center justify-center">
                            <img src={(status == GAME_STATUS.WON) ? `/assets/coinHeadsIcon.png` : `/assets/coinTailsIcon.png`} className="w-5 h-5"/>
                            <span className="font-bold px-2">
                              {(status == GAME_STATUS.WON) ? `Heads` : `Tails`}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center">
                            <img src={(status == GAME_STATUS.WON) ? `/assets/coinTailsIcon.png` : `/assets/coinHeadsIcon.png`} className="w-5 h-5" />
                            <span className="font-bold px-2">
                              {(status == GAME_STATUS.WON) ? `Tails` : `Heads`}
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </td>
                  */}
                  <td className="px-4 py-3 text-sm text-center">
                    <span
                      className={`inline-block px-3 py-1 rounded-full ${
                        status === GAME_STATUS.WON
                          ? 'bg-green-900/30 text-green-400'
                          : status === GAME_STATUS.LOST
                          ? 'bg-red-900/30 text-red-400'
                          : 'bg-yellow-900/30 text-yellow-400'
                      }`}
                    >
                      {status == GAME_STATUS.WON && (<>{`Won`}</>)}
                      {status == GAME_STATUS.LOST && (<>{`Lost`}</>)}
                      {status == GAME_STATUS.PENDING && (<>{`Pending`}</>)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-right">
                    {status == GAME_STATUS.WON && (
                      <span className="text-green-400 font-semibold">
                        +{formatTokens(wonAmount)}
                      </span>
                    )}
                    {status == GAME_STATUS.LOST && (
                      <span className="text-red-400 font-semibold">
                        -{formatTokens(betAmount)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center font-semibold">
                    {new Date(timestamp * 1000).toLocaleString() || '-'}
                  </td>
                </tr>
              )
            })}

            {games.length === 0 && (
              <tr>
                <td colSpan={(isPlayerGames) ? 7 : 6} className="px-4 py-6 text-center text-gray-400">
                  {`No games`}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {/* Пагинация */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center px-4 py-3 bg-gray-900 border-t border-gray-700">
          <button
            onClick={onPagePrev}
            disabled={currentPage === 1}
            className={`px-4 py-2 rounded ${
              currentPage === 1
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-gray-700 hover:bg-gray-600 text-white'
            }`}
          >
            {`Back`}
          </button>
          <span className="text-sm text-gray-300">
            {`Page `} {currentPage} {`of`} {totalPages}
          </span>
          <button
            onClick={onPageNext}
            disabled={currentPage === totalPages}
            className={`px-4 py-2 rounded ${
              currentPage === totalPages
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-gray-700 hover:bg-gray-600 text-white'
            }`}
          >
            {`Forward`}
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminGamesTable;