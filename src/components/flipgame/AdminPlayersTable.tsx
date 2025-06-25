import React, { useState } from 'react';
import { fromWei } from '@/helpers/wei'
import { getAddressLink, getShortAddress } from '@/helpers/etherscan'

const AdminPlayersTable: React.FC<AdminPlayersTableProps> = (props) => {
  const {
    players,
    itemsPerPage = 1,
    playersCount,
    currentPage,
    tokenInfo,
    onPageNext = () => {},
    onPagePrev = () => {},
    chainId,
    gotoPage
  } = props


  const totalPages = Math.ceil(playersCount / itemsPerPage);

  const formatTokens = (amount) => {
    return `${fromWei(amount, tokenInfo.decimals)}`
  }
  return (
    <div className="overflow-hidden rounded-lg shadow-md bg-gray-800 text-white">
      <div className="overflow-x-auto">
        <table className="min-w-full table-auto">
          <thead className="bg-gray-700">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold">
                {`Address`}
              </th>
              <th className="px-4 py-3 text-right text-sm font-semibold">
                {`Deposit (${tokenInfo.symbol})`}
              </th>
              <th className="px-4 py-3 text-right text-sm font-semibold">
                {`Bets (${tokenInfo.symbol})`}
              </th>
              <th className="px-4 py-3 text-right text-sm font-semibold">
                {`Won (${tokenInfo.symbol})`}
              </th>
              <th className="px-4 py-3 text-right text-sm font-semibold">
                {`Lost (${tokenInfo.symbol})`}
              </th>
              <th className="px-4 py-3 text-right text-sm font-semibold">
                {`Won Games`}
              </th>
              <th className="px-4 py-3 text-right text-sm font-semibold">
                {`Lost Games`}
              </th>
              <th className="px-4 py-3 text-center text-sm font-semibold">
                {`Last Game`}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-600">
            {players.map((player, index) => {
              
              return (
                <tr key={player.playerAddress} className="hover:bg-gray-700 transition-colors  text-sm font-semibold">
                  <td className="px-4 py-3 text-sm truncate max-w-xs">
                    <a
                      onClick={() => {
                        gotoPage(`/admin/playergames/${player.playerAddress}`)
                      }}
                      className="text-blue-300 cursor-pointer"
                    >
                      {getShortAddress(player.playerAddress, 8)}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-sm text-right">
                    {formatTokens(player.balance)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right">
                    {formatTokens(player.totalBets)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-green-400">
                    +{formatTokens(player.totalWon)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-red-400">
                    −{formatTokens(player.totalLost)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {player.wonGames}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {player.lostGames}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {new Date(player.lastGame * 1000).toLocaleString() || '-'}
                  </td>
                </tr>
              )
            })}

            {players.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-6 text-center text-gray-400">
                  {`No players`}
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

export default AdminPlayersTable;