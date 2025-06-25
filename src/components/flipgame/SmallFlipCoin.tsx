
const SmallFlipCoin = (props) => {

  return (
    <div className="coin-container small mr-2">
      <div className="coin flip">
        <div className="coin-side">
          <img src="/assets/coinHeadsIcon.png" alt="Heads" />
        </div>
        <div className="coin-side back">
          <img src="/assets/coinTailsIcon.png" alt="Tails" />
        </div>
      </div>
    </div>
  )
};

export default SmallFlipCoin;