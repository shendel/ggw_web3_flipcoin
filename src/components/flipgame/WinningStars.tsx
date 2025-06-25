const WinningStars = () => {
  const STAR_COUNT = 20;

  return (
    <>
      {[...Array(STAR_COUNT)].map((_, i) => (
        <div
          key={i}
          className="star absolute rounded-full bg-yellow-300 opacity-80 animate-shooting-star"
          style={{
            width: `${Math.random() * 6 + 2}px`,
            height: `${Math.random() * 6 + 2}px`,
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random()}s`,
          }}
        />
      ))}
    </>
  );
}

export default WinningStars