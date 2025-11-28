import { useState } from 'react';
import SmallFlipCoin from './SmallFlipCoin'
import { fromWei, toWei } from '@/helpers/wei'
import BigNumber from "bignumber.js"
import GameInfoModal from './GameInfoModal'
import { useConfirmationModal } from '@/components/ConfirmationModal'

import { GAME_STATUS } from '@/helpers_flipgame/constants'
const ITEMS_PER_PAGE = 5;

const GameHistoryTable = (props) => {
  const {
    games,
    tokenDecimals,
    winMultiplier
  } = props
  
  const { openModal } = useConfirmationModal()
  
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(games.length / ITEMS_PER_PAGE);
  const paginatedGames = games.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const goToPrevious = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const goToNext = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const handleOpenGameInfo = (gameInfo) => {
    openModal({
      title: `Game Info`,
      hideBottomButtons: true,
      fullWidth: true,
      id: 'GAME_INFO',
      content: (
        <GameInfoModal gameInfo={gameInfo} />
      )
    })
  }
  
  return (
    <div className="overflow-hidden rounded-lg shadow-md bg-gray-800 text-white">
      <table className="min-w-full table-auto">
        <thead className="bg-gray-700">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-semibold">{`Choise`}</th>
            <th className="px-4 py-3 text-left text-sm font-semibold">{`Bet`}</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-center">{`Result`}</th>
            <th className="px-4 py-3 text-right text-sm font-semibold">{`Summary`}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-600">
          {paginatedGames.length === 0 && (
            <tr>
              <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                {`No data on games`}
              </td>
            </tr>
          )}

          {paginatedGames.map((game, index) => (
            <tr key={index} className="hover:bg-gray-700 transition-colors cursor-pointer" onClick={() => { handleOpenGameInfo(game) }}>
              <td className="px-4 py-3 text-sm">
                <span className="flex items-center">
                  {game.chosenSide === true ? (
                    <img src="/assets/coinHeadsIcon.png" alt="Heads" className="w-5 h-5 mr-2" />
                  ) : (
                    <img src="/assets/coinTailsIcon.png" alt="Tails" className="w-5 h-5 mr-2" />
                  )}
                </span>
              </td>
              <td className="px-4 py-3 text-sm">{fromWei(game.amount, tokenDecimals)}</td>
              <td className="px-4 py-3 text-sm">
                {game.status == GAME_STATUS.WON && (
                  <img src={(game.chosenSide) ? `/assets/coinHeadsIcon.png` : `/assets/coinTailsIcon.png`} className="w-5 h-5" style={{margin: '0 auto'}} />
                )}
                {game.status == GAME_STATUS.LOST && (
                  <img src={(!game.chosenSide) ? `/assets/coinHeadsIcon.png` : `/assets/coinTailsIcon.png`} className="w-5 h-5" style={{margin: '0 auto'}} />
                )}
                {game.status == GAME_STATUS.PENDING && (
                  <SmallFlipCoin />
                )}
              </td>
              <td className="px-4 py-3 text-right">
                {game.status == GAME_STATUS.WON && (
                  <span className="text-green-400 font-bold">
                    {`+`}
                    {fromWei(
                      new BigNumber(
                        game.amount
                      ).multipliedBy(
                        winMultiplier
                      ).dividedBy( toWei( 1 )).toString(),
                      tokenDecimals
                    )}
                  </span>
                )}
                {game.status == GAME_STATUS.LOST && (
                  <span className="text-red-400 font-bold">
                    {`−`}
                    {fromWei(game.amount, tokenDecimals)}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Пагинация */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center px-4 py-3 bg-gray-900 border-t border-gray-700">
          <button
            onClick={goToPrevious}
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
            {`Page ${currentPage} of ${totalPages}`}
          </span>
          <button
            onClick={goToNext}
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

export default GameHistoryTable;