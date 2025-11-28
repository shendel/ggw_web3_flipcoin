// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

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
interface IGGWDeposit {
    struct Game {
        uint256 gameId;
        address gameAddress;
        uint256 bankAmount;
        uint256 pendingBankAmount;
        string description;
    }
    function getUserDeposit(address userAddress) external view returns (uint256);
    function gameBurnAndStake(uint256 amount) external;
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
        bytes32 random;
        uint256 requestId;
        bool chosenSide; // true = heads, false = tails
        uint256 timestamp;
        GameStatus status;
        uint256 playBlock;
        uint256 filledBlock;
    }
    bytes32 constant notFilledRandom = 0x00000000000000000000000000000000;

    uint256 public constant PRECISION = 1e18;
    uint256 public winMultiplier = 2 * PRECISION;

    // ==== Состояния ====
    address public owner;
    // 1bp = 0.01%, 100bp = 1%, 10000bp = 100%
    uint256 public onLosePercentToProcess = 1000; // 10%
    IERC20 public token;
    IRandomGenerator public randomGenerator;
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
    mapping(uint256 => uint256) public gameRequests;
    
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
        address _depositManager
    ) {
        owner = msg.sender;
        token = IERC20(_tokenAddress);
        randomGenerator = IRandomGenerator(_randomGeneratorAddress);
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

    function play(uint256 betAmount, bool chosenSide) external nonReentrant {
        PlayerAccount storage player = players[msg.sender];
        uint256 playerBalance = depositManager.getUserDeposit(msg.sender);
        require(betAmount >= minBet, "Bet to low");
        require(betAmount <= maxBet, "Bet to hight");
        require(playerBalance >= betAmount, "Not enough deposit");
        require(player.blocked == false, "Not allowed for you");
        
        uint256 winAmount = (betAmount * winMultiplier) / PRECISION;
        require(gameBank() > winAmount, "No coins in bank");

        gamesCount++;
        // Забираем ставку из депозита
        if (player.playerAddress != msg.sender) {
            player.playerAddress = msg.sender;
            playersAddresses[playersCount] = msg.sender;
            playersCount++;
        }
        depositManager.gameWithdrawUserDeposit(msg.sender, betAmount);

        player.totalBets = player.totalBets + betAmount;
        player.lastGame = block.timestamp;

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
            status: GameStatus.Pending,
            playBlock: block.number - 1,
            filledBlock: 0
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
        game.filledBlock = block.number - 1;
        bool result = uint256(keccak256(abi.encodePacked(
            random,
            requestId,
            blockhash(game.playBlock),
            blockhash(game.filledBlock)
        ))) % 2 == 0;
        bool won = (game.chosenSide == result);
        PlayerAccount storage player = players[game.player];
        if (won) {
            uint256 winAmount = (game.amount * winMultiplier) / PRECISION;
            player.totalWon = player.totalWon + winAmount;
            player.wonGames++;

            totalWonAmount = totalWonAmount + winAmount;
            wonGamesCount++;

            depositManager.gameDepositUserDeposit(player.playerAddress, winAmount);
            game.wonAmount = winAmount;
            game.status = GameStatus.Won;
            emit GameResult(game.player, gameRequests[requestId], requestId, game.amount, true, winAmount);
        } else {
            player.totalLost = player.totalLost + game.amount;
            player.lostGames++;
            totalLostAmount = totalLostAmount + game.amount;
            lostGamesCount++;

            uint256 lostToProcess = game.amount * (onLosePercentToProcess) / 10000;

            game.status = GameStatus.Lost;
            
            if (lostToProcess > 0) {
                depositManager.gameBurnAndStake(lostToProcess);
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

    function setOnLoseToProcess(uint256 newValue) public onlyOwner {
        onLosePercentToProcess = newValue;
    }
    function setRandomGenerator(address _newGenerator) public onlyOwner {
        randomGenerator = IRandomGenerator(_newGenerator);
    }
    function setDepostiManager(address _newDepositManager) public onlyOwner {
        depositManager = IGGWDeposit(_newDepositManager);
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