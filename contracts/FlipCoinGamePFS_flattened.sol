
// File: @openzeppelin/contracts/security/ReentrancyGuard.sol


// OpenZeppelin Contracts (last updated v4.9.0) (security/ReentrancyGuard.sol)

pragma solidity ^0.8.0;

/**
 * @dev Contract module that helps prevent reentrant calls to a function.
 *
 * Inheriting from `ReentrancyGuard` will make the {nonReentrant} modifier
 * available, which can be applied to functions to make sure there are no nested
 * (reentrant) calls to them.
 *
 * Note that because there is a single `nonReentrant` guard, functions marked as
 * `nonReentrant` may not call one another. This can be worked around by making
 * those functions `private`, and then adding `external` `nonReentrant` entry
 * points to them.
 *
 * TIP: If you would like to learn more about reentrancy and alternative ways
 * to protect against it, check out our blog post
 * https://blog.openzeppelin.com/reentrancy-after-istanbul/[Reentrancy After Istanbul].
 */
abstract contract ReentrancyGuard {
    // Booleans are more expensive than uint256 or any type that takes up a full
    // word because each write operation emits an extra SLOAD to first read the
    // slot's contents, replace the bits taken up by the boolean, and then write
    // back. This is the compiler's defense against contract upgrades and
    // pointer aliasing, and it cannot be disabled.

    // The values being non-zero value makes deployment a bit more expensive,
    // but in exchange the refund on every call to nonReentrant will be lower in
    // amount. Since refunds are capped to a percentage of the total
    // transaction's gas, it is best to keep them low in cases like this one, to
    // increase the likelihood of the full refund coming into effect.
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;

    uint256 private _status;

    constructor() {
        _status = _NOT_ENTERED;
    }

    /**
     * @dev Prevents a contract from calling itself, directly or indirectly.
     * Calling a `nonReentrant` function from another `nonReentrant`
     * function is not supported. It is possible to prevent this from happening
     * by making the `nonReentrant` function external, and making it call a
     * `private` function that does the actual work.
     */
    modifier nonReentrant() {
        _nonReentrantBefore();
        _;
        _nonReentrantAfter();
    }

    function _nonReentrantBefore() private {
        // On the first call to nonReentrant, _status will be _NOT_ENTERED
        require(_status != _ENTERED, "ReentrancyGuard: reentrant call");

        // Any calls to nonReentrant after this point will fail
        _status = _ENTERED;
    }

    function _nonReentrantAfter() private {
        // By storing the original value once again, a refund is triggered (see
        // https://eips.ethereum.org/EIPS/eip-2200)
        _status = _NOT_ENTERED;
    }

    /**
     * @dev Returns true if the reentrancy guard is currently set to "entered", which indicates there is a
     * `nonReentrant` function in the call stack.
     */
    function _reentrancyGuardEntered() internal view returns (bool) {
        return _status == _ENTERED;
    }
}

// File: FlipCoinGamePFS.sol


pragma solidity 0.8.24;


interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 value) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function transferFrom(address from, address to, uint256 value) external returns (bool);
    function name() external view returns (string memory);
    function decimals() external view returns (uint8);
    function symbol() external view returns (string memory);
}
interface IGGWDeposit {
    struct Game {
        uint256 gameId;
        string gameCode;
        bytes32 gameCodeHash;
        address gameAddress;
        uint256 bankAmount;
        uint256 pendingBankAmount;
        uint256 burnPercent;        // pt 100 = 100%
        uint256 stakePercent;       // burnPercent+stakePercent = 100
        uint256 gasPercent;
        string description;
    }
    function getUserDeposit(address userAddress) external view returns (uint256);
    function gameBurnAndStake(uint256 fromAmount) external;
    function gameWithdrawUserDeposit(address userAddress, uint256 amount) external;
    function gameDepositUserDeposit(address userAddress, uint256 amount) external;
    function getGame(address gameAddress) external view returns (Game memory); 
}
contract FlipCoinGame is ReentrancyGuard {
    // ==== Типы ====
    enum GameStatus { Pending, Won, Lost }

    struct PlayerAccount {
        address playerAddress;
        uint256 totalBets;
        uint256 totalWon;
        uint256 totalLost;
        uint256 wonGames;
        uint256 lostGames;
        uint256 lastGame;
        bool blocked;
    }
    struct TokenInfo {
        string symbol;
        string name;
        uint8 decimals;
        uint256 userBalance;
        uint256 userAllowance;
    }
    struct Game {
        uint256 gameId;
        address player;
        uint256 amount;
        uint256 wonAmount;
        bytes32 hash;
        bytes32 random;
        bool chosenSide; // true = heads, false = tails
        uint256 timestamp;
        GameStatus status;
    }
    bytes32 constant notFilledRandom = 0x00000000000000000000000000000000;

    uint256 public constant PRECISION = 1e18;
    uint256 public winMultiplier = 2 * PRECISION;

    // ==== Состояния ====
    address public owner;
    address public oracle;
    IERC20 public token;

    IGGWDeposit public depositManager;

    mapping(address => PlayerAccount) public players;
    mapping(uint256 => address) public playersAddresses;
    uint256 public playersCount;
    uint256 public totalPlayersDeposit;

    mapping(uint256 => Game) public games;
    uint256 public gamesCount;
    uint256 public wonGamesCount;
    uint256 public lostGamesCount;
    uint256 public totalWonAmount;
    uint256 public totalLostAmount;
    mapping(address => uint256[]) public playerGames;

    
    uint256 public minBet = 1 ether;
    uint256 public maxBet = 100 ether;

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor(
        address _tokenAddress,
        address _oracle,
        address _depositManager
    ) {
        owner = msg.sender;
        oracle = _oracle;
        token = IERC20(_tokenAddress);
        depositManager = IGGWDeposit(_depositManager);
    }

    function getGame(uint256 gameId) public view returns (Game memory) {
        return games[gameId];
    }

    function getPlayerGamesCount(address player) public view returns (uint256) {
        return playerGames[player].length;
    }

    function getPlayerGames(address player, uint256 _offset, uint256 _limit) public view returns (Game[] memory ret) {
        if (_limit == 0) _limit = playerGames[player].length;
        uint256 iEnd = _offset + _limit;
        if (_offset > playerGames[player].length) return ret;
        if (iEnd > playerGames[player].length) iEnd = playerGames[player].length;

        ret = new Game[](iEnd - _offset);
        for (uint256 i = 0; i < iEnd - _offset ; i++) {
            ret[i] = games[
                playerGames[player][
                    playerGames[player].length - i - _offset - 1
                ]
            ];
        }

        return ret;
    }

    function getGames(uint256 _offset, uint256 _limit) public view returns (Game[] memory ret) {
        if (_limit == 0) _limit = gamesCount;
        uint256 iEnd = _offset + _limit;
        if (_offset > gamesCount) return ret;
        if (iEnd > gamesCount) iEnd = gamesCount;

        ret = new Game[](iEnd - _offset);
        for (uint256 i = 0; i < iEnd - _offset; i++) {
            ret[i] = games[
                gamesCount - i - _offset
            ];
        }
        return ret;
    }
    // ==== Игра ====
    event GameResult(
        address indexed player,
        uint256 gameId,
        uint256 betAmount,
        bytes32 hash,
        bytes32 random,
        bool won,
        uint256 reward
    );

    function play(address playerAddress, uint256 betAmount, bool chosenSide, bytes32 hash, bytes32 random) external nonReentrant {
        require(msg.sender == oracle, "Only oracle");
        require(keccak256(abi.encodePacked(random)) == hash, "Invalid random for this hash");
        require(betAmount >= minBet, "Bet to low");
        require(betAmount <= maxBet, "Bet to hight");
        
        uint256 winAmount = (betAmount * winMultiplier) / PRECISION;
        require(gameBank() > winAmount, "No coins in bank");

        PlayerAccount storage player = players[playerAddress];
        uint256 playerBalance = depositManager.getUserDeposit(playerAddress);
        require(playerBalance >= betAmount, "Not enough deposit");
        require(player.blocked == false, "Not allowed for you");
        
        

        if (player.playerAddress != playerAddress) {
            player.playerAddress = playerAddress;
            playersAddresses[playersCount] = playerAddress;
            playersCount++;
        }
        

        player.totalBets = player.totalBets + betAmount;
        player.lastGame = block.timestamp;


        bool result = uint256(keccak256(abi.encodePacked(
            random
        ))) % 2 == 0;
        bool won = (chosenSide == result);

        if (won) {
            player.totalWon = player.totalWon + winAmount;
            player.wonGames++;

            totalWonAmount = totalWonAmount + winAmount;
            wonGamesCount++;

            depositManager.gameDepositUserDeposit(player.playerAddress, winAmount - betAmount);
            gamesCount++;
            games[gamesCount] = Game({
                gameId: gamesCount,
                player: playerAddress,
                hash: hash,
                random: random,
                amount: betAmount,
                wonAmount: winAmount,
                chosenSide: chosenSide,
                timestamp: block.timestamp,
                status: GameStatus.Won
            });
            playerGames[playerAddress].push(gamesCount);

            emit GameResult(playerAddress, gamesCount, betAmount, hash, random, true, winAmount);
        } else {
            player.totalLost = player.totalLost + betAmount;
            player.lostGames++;
            totalLostAmount = totalLostAmount + betAmount;
            lostGamesCount++;

            depositManager.gameWithdrawUserDeposit(playerAddress, betAmount);
            depositManager.gameBurnAndStake(betAmount);
            gamesCount++;
            games[gamesCount] = Game({
                gameId: gamesCount,
                player: playerAddress,
                hash: hash,
                random: random,
                amount: betAmount,
                wonAmount: 0,
                chosenSide: chosenSide,
                timestamp: block.timestamp,
                status: GameStatus.Lost
            });
            playerGames[playerAddress].push(gamesCount);
            emit GameResult(playerAddress, gamesCount, betAmount, hash, random, false, 0);
        }
    }

    // ==== Управление ====
    function setWinMultiplier(uint256 newMultiplier) external onlyOwner {
        winMultiplier = newMultiplier;
    }
    function getReward(uint256 amount) public view returns (uint256) {
        return (amount * winMultiplier) / PRECISION;
    }
    function recoverWrongToken(address tokenAddress, uint256 amount) external onlyOwner {
        require(tokenAddress != address(token), "Cant recower game token. Only bank withdraw");
        IERC20(tokenAddress).transfer(owner, amount);
    }
    function getDepositOf(address player) external view returns (uint256) {
        return depositManager.getUserDeposit(player);
    }
    function gameBank() public view returns (uint256) {
        IGGWDeposit.Game memory game = depositManager.getGame(address(this));
        return game.bankAmount;
    }
    function getPlayersCount() public view returns (uint256) {
        return playersCount;
    }

    function getPlayers(uint256 _offset, uint256 _limit) public view returns (PlayerAccount[] memory ret) {
        if (_limit == 0) _limit = playersCount;
        if (_offset > playersCount) return ret;
        uint256 iEnd = _offset + _limit;
        if (iEnd > playersCount) iEnd = playersCount;

        ret = new PlayerAccount[](iEnd - _offset);
        for (uint256 i = 0; i < iEnd - _offset ; i++) {
            ret[i] = players[
                playersAddresses[
                    playersCount - i - _offset - 1
                ]
            ];
        }
    }
    function setPlayerBlock(address playerAddress, bool isBlocked) public onlyOwner {
        players[playerAddress].blocked = isBlocked;
    }

    function getGameStatus(uint256 requestId) external view returns (GameStatus) {
        return games[requestId].status;
    }
    function setDepostiManager(address _newDepositManager) public onlyOwner {
        depositManager = IGGWDeposit(_newDepositManager);
    }
    function setOracle(address _newOracle) public onlyOwner {
        oracle = _newOracle;
    }
    function setMinBet(uint256 newValue) public onlyOwner {
        minBet = newValue;
    }
    function setMaxBet(uint256 newValue) public onlyOwner {
        maxBet = newValue;
    }
    function transferOwnerShip(address newOwner) public onlyOwner {
        owner = newOwner;
    }
    function getTokenInfo(address player) public view returns (TokenInfo memory ret) {
        ret.symbol = token.symbol();
        ret.name = token.name();
        ret.decimals = token.decimals();
        ret.userBalance = token.balanceOf(player);
        ret.userAllowance = token.allowance(player, address(depositManager));
    }
}