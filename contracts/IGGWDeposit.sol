// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IGGWDeposit {
    function getUserDeposit(address userAddress) external view returns (uint256);
    function gameBurnAndStake(uint256 amount) external;
    function gameWithdrawUserDeposit(address userAddress, uint256 amount) external;
    function gameDepositUserDeposit(address userAddress, uint256 amount) external;
}