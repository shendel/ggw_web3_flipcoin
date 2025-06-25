
const Coin = (props) => {
  const {
    isHeads,
    isFlipping,
    onClick
  } = props
  
  if (!isFlipping) {
    return (
      <div className="coin-container">
        <div className="coin">
          <div className="coin-side" onClick={onClick}>
            <img
              src={(isHeads) ? `/assets/sideHeads.png` : `/assets/sideTails.png`}
              alt={(isHeads) ? 'Heads' : 'Tails'}
              title={(isHeads) ? 'Heads' : 'Tails'}
            />
          </div>
        </div>
      </div>
    )
  }
  return (
    <div className="coin-container">
      <div className={isFlipping ? 'coin flip' : 'coin'}>
        <div className="coin-side">
          <img src="/assets/sideHeads.png" alt="Heads" />
        </div>
        <div className="coin-side back">
          <img src="/assets/sideTails.png" alt="Tails" />
        </div>
      </div>
    </div>
  )
};

export default Coin;