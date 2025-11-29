// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

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
    event GameReverted(
        address indexed player,
        uint256 betAmount,
        bytes32 hash,
        bytes32 random
    );

    function playBatch(
        address[] memory playerAddress,
        uint256[] memory betAmount,
        bool[] memory chosenSide,
        bytes32[] memory hash,
        bytes32[] memory random
    ) external nonReentrant {
        require(msg.sender == oracle, "Only oracle");
        require(
            playerAddress.length == betAmount.length
            && playerAddress.length == chosenSide.length
            && playerAddress.length == hash.length
            && playerAddress.length == random.length, "Bad input"
        );
        for (uint256 i = 0;i < playerAddress.length; i++) {
            __play(playerAddress[i], betAmount[i], chosenSide[i], hash[i], random[i]);
        }
    }

    function play(
        address playerAddress,
        uint256 betAmount,
        bool chosenSide,
        bytes32 hash,
        bytes32 random
    ) external nonReentrant {
        require(msg.sender == oracle, "Only oracle");
        __play(playerAddress,betAmount, chosenSide, hash, random);
    }

    function __play(
        address playerAddress,
        uint256 betAmount,
        bool chosenSide,
        bytes32 hash,
        bytes32 random
    ) internal {
        if (betAmount >= minBet && betAmount <= maxBet) {
            PlayerAccount storage player = players[playerAddress];
            uint256 playerBalance = depositManager.getUserDeposit(playerAddress);
            if (!player.blocked && playerBalance >= betAmount) {
                uint256 winAmount = (betAmount * winMultiplier) / PRECISION;

                if (player.playerAddress == address(0)) {
                    player.playerAddress = playerAddress;
                    playersAddresses[playersCount++] = playerAddress;
                }

                player.totalBets += betAmount;
                player.lastGame = block.timestamp;

                bool result = (uint256(random) & 1) == 0;
                bool won = (chosenSide == result);

                uint256 gameId = ++gamesCount;

                if (won) {
                    player.totalWon += winAmount;
                    player.wonGames++;
                    totalWonAmount += winAmount;
                    wonGamesCount++;

                    depositManager.gameDepositUserDeposit(playerAddress, winAmount - betAmount);
                } else {
                    player.totalLost += betAmount;
                    player.lostGames++;
                    totalLostAmount += betAmount;
                    lostGamesCount++;

                    depositManager.gameWithdrawUserDeposit(playerAddress, betAmount);
                    depositManager.gameBurnAndStake(betAmount);
                }

                games[gameId] = Game({
                    gameId: gameId,
                    player: playerAddress,
                    amount: betAmount,
                    wonAmount: won ? winAmount : 0,
                    chosenSide: chosenSide,
                    hash: hash,
                    random: random,
                    timestamp: block.timestamp,
                    status: won ? GameStatus.Won : GameStatus.Lost
                });

                playerGames[playerAddress].push(gameId);

                emit GameResult(playerAddress, gameId, betAmount, hash, random, won, won ? winAmount : 0);
                return;
            }
        }
        emit GameReverted(
            playerAddress,
            betAmount,
            hash,
            random
        );
    }
    function getLastPlayerGame(address playerAddress) public view returns (Game memory ret) {
        if (playerGames[playerAddress].length > 0) {
            return games[
                playerGames[playerAddress][
                    playerGames[playerAddress].length - 1
                ]
            ];
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