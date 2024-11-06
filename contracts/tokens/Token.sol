// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Token is ERC20 {
    constructor(
        string memory _name,
        string memory _symbol,
        address _to,
        uint256 _totalSupply
    ) ERC20(_name, _symbol) {
        _mint(_to, _totalSupply);
    }
}
