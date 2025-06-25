
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

// File: FlipCoinGame.sol


pragma solidity 0.8.24;

interface IRandomGenerator {
    function requestRandom() external returns (uint256);
    function getRandom(uint256 requestId) external view returns (bytes32);
    function isFilled(uint256 requestId) external view returns (bool);
    function setSubscriber(address subscriber, bool isSubscriber) external;
}

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 value) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function transferFrom(address from, address to, uint256 value) external returns (bool);
    function name() external view returns (string memory);
    function decimals() external view returns (uint8);
    function symbol() external view returns (string memory);
}
contract FlipCoinGame is ReentrancyGuard {
    // ==== Типы ====
    enum GameStatus { Pending, Won, Lost }

    struct PlayerAccount {
        address playerAddress;
        uint256 balance;
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
        bytes32 random;
        uint256 requestId;
        bool chosenSide; // true = heads, false = tails
        uint256 timestamp;
        GameStatus status;
    }
    bytes32 constant notFilledRandom = 0x00000000000000000000000000000000;

    uint256 public constant PRECISION = 1e18;
    uint256 public winMultiplier = 2 * PRECISION;

    // ==== Состояния ====
    address public owner;
    address public burnAndStakeAddress;
    // 1bp = 0.01%, 100bp = 1%, 10000bp = 100%
    uint256 public onLosePercentToProcess = 1000; // 10%
    IERC20 public token;
    IRandomGenerator public randomGenerator;

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
    mapping(uint256 => uint256) public gameRequests;

    uint256 public gameBank;
    uint256 public pendingBank;
    
    uint256 public minBet = 1 ether;
    uint256 public maxBet = 100 ether;

    event Deposit(address indexed player, uint256 amount);
    event Withdraw(address indexed player, uint256 amount);
    event GameRequested(
        address indexed player,
        uint256 gameId,
        uint256 requestId,
        uint256 betAmount,
        bool chosenSide
    );
    event GameResult(
        address indexed player,
        uint256 gameId,
        uint256 requestId,
        uint256 betAmount,
        bool won,
        uint256 reward
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor(
        address _tokenAddress,
        address _randomGeneratorAddress,
        address _burnAndStakeAddress
    ) {
        owner = msg.sender;
        token = IERC20(_tokenAddress);
        randomGenerator = IRandomGenerator(_randomGeneratorAddress);
        burnAndStakeAddress = _burnAndStakeAddress;
    }

    // ==== Управление депозитом ====

    function deposit(uint256 amount) external nonReentrant {
        require(amount > 0, "Deposit amount must be > 0");
        token.transferFrom(msg.sender, address(this), amount);
        if (players[msg.sender].playerAddress != msg.sender) {
            players[msg.sender].playerAddress = msg.sender;
            playersAddresses[playersCount] = msg.sender;
            playersCount++;
        }
        players[msg.sender].balance = players[msg.sender].balance + amount;
        totalPlayersDeposit = totalPlayersDeposit + amount;
        emit Deposit(msg.sender, amount);
    }

    function withdraw(uint256 amount) external nonReentrant {
        PlayerAccount storage player = players[msg.sender];
        require(player.balance >= amount, "Insufficient deposit");
        player.balance = player.balance - amount;
        totalPlayersDeposit = totalPlayersDeposit - amount;
        token.transfer(msg.sender, amount);
        emit Withdraw(msg.sender, amount);
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

    function play(uint256 betAmount, bool chosenSide) external nonReentrant {
        PlayerAccount storage player = players[msg.sender];
        require(betAmount >= minBet, "Bet to low");
        require(betAmount <= maxBet, "Bet to hight");
        require(player.balance >= betAmount, "Not enough deposit");
        require(player.blocked == false, "Not allowed for you");
        
        uint256 winAmount = (betAmount * winMultiplier) / PRECISION;
        require(gameBank > winAmount, "No coins in bank");

        gamesCount++;
        // Забираем ставку из депозита
        if (player.playerAddress != msg.sender) {
            player.playerAddress = msg.sender;
            playersAddresses[playersCount] = msg.sender;
            playersCount++;
        }
        player.balance = player.balance - betAmount;
        player.totalBets = player.totalBets + betAmount;
        player.lastGame = block.timestamp;
        totalPlayersDeposit = totalPlayersDeposit - betAmount;
        // Запрашиваем случайное число
        uint256 requestId = randomGenerator.requestRandom();

        // Сохраняем игру в состоянии ожидания
        games[gamesCount] = Game({
            gameId: gamesCount,
            player: msg.sender,
            requestId: requestId,
            random: notFilledRandom,
            amount: betAmount,
            wonAmount: 0,
            chosenSide: chosenSide,
            timestamp: block.timestamp,
            status: GameStatus.Pending
        });
        playerGames[msg.sender].push(gamesCount);
        gameRequests[requestId] = gamesCount;

        emit GameRequested(msg.sender, gamesCount, requestId, betAmount, chosenSide);
    }

    // Вызывается при получении случайного числа
    function fulfillRandom(uint256 requestId, bytes32 random) external {
        require(
            address(randomGenerator) == msg.sender,
            "Only random generator can call this"
        );
        
        Game storage game = games[gameRequests[requestId]];
        require(game.status == GameStatus.Pending, "Game not pending");
        require(game.requestId == requestId, "Dismatch request id");
        require(game.random == notFilledRandom, "Already filled");

        // Генерируем результат
        game.random = random;
        bool result = uint256(keccak256(abi.encodePacked(random, requestId))) % 2 == 0;
        bool won = (game.chosenSide == result);
        PlayerAccount storage player = players[game.player];
        if (won) {
            uint256 winAmount = (game.amount * winMultiplier) / PRECISION;
            player.balance = player.balance + winAmount;
            player.totalWon = player.totalWon + winAmount;
            player.wonGames++;

            totalWonAmount = totalWonAmount + winAmount;
            totalPlayersDeposit = totalPlayersDeposit + winAmount;
            wonGamesCount++;
            
            if (gameBank >= (winAmount - game.amount)) {
                gameBank = gameBank - (winAmount - game.amount);
            } else {
                pendingBank = pendingBank + winAmount;
            }
            game.wonAmount = winAmount;
            game.status = GameStatus.Won;
            emit GameResult(game.player, gameRequests[requestId], requestId, game.amount, true, winAmount);
        } else {
            player.totalLost = player.totalLost + game.amount;
            player.lostGames++;
            totalLostAmount = totalLostAmount + game.amount;
            lostGamesCount++;

            uint256 lostToBank = game.amount * (10000 - onLosePercentToProcess) / 10000;
            uint256 lostToProcess = game.amount * (onLosePercentToProcess) / 10000;

            gameBank = gameBank + lostToBank;
            game.status = GameStatus.Lost;

            if (lostToProcess > 0) {
                if (burnAndStakeAddress != address(0)) {
                    token.transfer(burnAndStakeAddress, lostToProcess);
                } else {
                    gameBank = gameBank + lostToProcess;
                }
            }

            emit GameResult(game.player, gameRequests[requestId], requestId, game.amount, false, 0);
        }
    }

    // ==== Управление ====
    function setWinMultiplier(uint256 newMultiplier) external onlyOwner {
        winMultiplier = newMultiplier;
    }
    function getReward(uint256 amount) public view returns (uint256) {
        return (amount * winMultiplier) / PRECISION;
    }
    function setBurnAndStakeAddress(address newBurnAndStakeAddress) external onlyOwner {
        burnAndStakeAddress = newBurnAndStakeAddress;
    }
    function withdrawBankBalance(uint256 amount) external nonReentrant onlyOwner {
        require(amount <= gameBank, "Not enough in bank");
        gameBank = gameBank - amount;
        token.transfer(owner, amount);
    }
    function recoverWrongToken(address tokenAddress, uint256 amount) external onlyOwner {
        require(tokenAddress != address(token), "Cant recower game token. Only bank withdraw");
        IERC20(tokenAddress).transfer(owner, amount);
    }
    function addBankBalance(uint256 amount) external nonReentrant onlyOwner {
        require(amount > 0, "Amount must be > 0");
        token.transferFrom(msg.sender, address(this), amount);
        gameBank = gameBank + amount;
    }
    function addPendingBankBalance(uint256 amount) external nonReentrant onlyOwner {
        require(amount > 0, "Amount must be > 0");
        token.transferFrom(msg.sender, address(this), amount);
        if (pendingBank > 0 && amount >= pendingBank) {
            pendingBank = 0;
        } else if (pendingBank > 0) {
            pendingBank -= amount;
        }
    }
    function getDepositOf(address player) external view returns (uint256) {
        return players[player].balance;
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

    function setOnLoseToProcess(uint256 newValue) public onlyOwner {
        onLosePercentToProcess = newValue;
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
        ret.userAllowance = token.allowance(player, address(this));
    }
}