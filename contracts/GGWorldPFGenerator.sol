/*
 * -= GG World Provably Fair Random Generator =-
 * Solidity: 0.8.24
 * Optimization: Yes
 * Runs: 200
 * EVM: cancun
*/
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;


abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }
    function _msgData() internal view virtual returns (bytes calldata) {
        this;
        return msg.data;
    }
}

abstract contract Ownable is Context {
    address private _owner;
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    constructor() {
        address msgSender = _msgSender();
        _owner = msgSender;
        emit OwnershipTransferred(address(0), msgSender);
    }
    function owner() public view virtual returns (address) {
        return _owner;
    }
    modifier onlyOwner() {
        require(owner() == _msgSender(), "Ownable: caller is not the owner");
        _;
    }
    function renounceOwnership() public virtual onlyOwner {
        emit OwnershipTransferred(_owner, address(0));
        _owner = address(0);
    }
    function transferOwnership(address newOwner) public virtual onlyOwner {
        require(newOwner != address(0), "Ownable: new owner is the zero address");
        emit OwnershipTransferred(_owner, newOwner);
        _owner = newOwner;
    }
}

abstract contract ReentrancyGuard {
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;

    uint256 private _status;

    constructor() {
        _status = _NOT_ENTERED;
    }
    modifier nonReentrant() {
        require(_status != _ENTERED, "ReentrancyGuard: reentrant call");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }
}

interface RandomAccepter {
    function fulfillRandom(uint256 requestId, bytes32 random) external; 
}
contract GGWorldProvablyFairRandomGenerator is Ownable, ReentrancyGuard {
    uint256 public requestsCount = 0;
    struct Request {
        address from;
        address initiator;
        uint256 requestId;
        bytes32 hash;
        bytes32 random;
        bool filled;
        bool droped;
    }

    mapping(uint256 => Request) private requests;
    mapping(uint256 => uint256) public notFilledIndex;
    uint256[] private notFilled;
    mapping(address => bool) private subscribers;
    address private oracle;

    constructor() Ownable() {
        subscribers[msg.sender] = true;
        oracle = msg.sender;
    }

    function setSubscriber(address subscriber, bool isSubscriber) public onlyOwner {
        subscribers[subscriber] = isSubscriber;
    }
    function setOracle(address newOracle) public onlyOwner {
        oracle = newOracle;
    }
    function getOracle() public view returns (address) {
        return oracle;
    }

    function getNotFilled() public view returns (Request[] memory) {
        Request[] memory notFilledData = new Request[](notFilled.length);
        for (uint256 i = 0; i < notFilled.length; i++) {
            notFilledData[i] = requests[notFilled[i]];
        }
        return notFilledData;
    }
    event RequestRandom(address from, uint256 requestId);
    
    function requestRandom(bytes32 hash) public nonReentrant returns (uint256)  {
        require(subscribers[msg.sender] == true, "Not allowed");
        requestsCount++;

        requests[requestsCount] = Request({
            from: msg.sender,
            initiator: tx.origin,
            requestId: requestsCount,
            hash: hash,
            random: 0x00,
            filled: false,
            droped: false
        });

        notFilledIndex[requestsCount] = notFilled.length;
        notFilled.push(requestsCount);

        emit RequestRandom(msg.sender, requestsCount);
        return requestsCount;
    }
    function dropRequest(uint256 requestId) public onlyOwner {
        Request storage req = requests[requestId];
        if (!req.filled && !req.droped) {
            req.droped = true;
            uint256 requestIndex = notFilledIndex[requestId];
            if (requestIndex < notFilled.length) {
                notFilled[requestIndex] = notFilled[notFilled.length - 1];
                notFilledIndex[notFilled[notFilled.length - 1]] = requestIndex;
            }
        }
    }
    event FilledRandom(uint256 requestId, bytes32 random);
    event BatchFulfilled(uint256[] requestIds);
    function batchFillRandom(
        uint256[] calldata requestIds,
        bytes32[] calldata hashes,
        bytes32[] calldata randoms
    ) external nonReentrant {
        require(msg.sender == oracle, "Not allowed");
        require(requestIds.length == randoms.length, "Count mismatch");

        for (uint256 i = 0; i < requestIds.length; i++) {
            uint256 requestId = requestIds[i];
            bytes32 random = randoms[i];
            bytes32 hash = hashes[i];

            Request storage req = requests[requestId];
            if (req.requestId == requestId && !req.filled && hash == req.hash && !req.droped) {
                req.random = random;
                req.filled = true;

                uint256 requestIndex = notFilledIndex[requestId];
                if (requestIndex < notFilled.length) {
                    notFilled[requestIndex] = notFilled[notFilled.length - 1];
                    notFilledIndex[notFilled[notFilled.length - 1]] = requestIndex;
                }
                notFilled.pop();

                emit FilledRandom(requestId, random);

                if (isContract(req.from)) {
                    try RandomAccepter(req.from).fulfillRandom(requestId, random) {}
                    catch {}
                }
            }
        }

        emit BatchFulfilled(requestIds);
    }

    function isContract(address account) internal view returns (bool) {
        uint size;
        assembly {
            size := extcodesize(account)
        }
        return size > 0;
    }
    function getHash(uint256 requestId) public view returns (bytes32) {
        return requests[requestId].hash;
    }
    function getRandom(uint256 requestId) public view returns (bytes32) {
        return requests[requestId].random;
    }
    function isFilled(uint256 requestId) public view returns (bool) {
        return requests[requestId].filled;
    }
}