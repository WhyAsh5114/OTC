// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract USDC is ERC20 {
    constructor(uint256 initialSupply) ERC20("USD Circle", "USDC") {
        _mint(msg.sender, initialSupply);
    }
}
