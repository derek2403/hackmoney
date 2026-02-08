// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title OutcomeToken
 * @notice ERC-20 token representing a specific corner outcome in a prediction market
 * @dev Only the authorized minter (SwapRouter) can mint tokens
 */
contract OutcomeToken is ERC20 {
    string private _name;
    string private _symbol;
    bool public initialized;

    address public minter;

    error OnlyMinter();

    modifier onlyMinter() {
        if (msg.sender != minter) revert OnlyMinter();
        _;
    }

    constructor() ERC20("", "") {}

    function initialize(
        string memory name_,
        string memory symbol_,
        address minter_
    ) external {
        if (initialized) revert("Already initialized");
        initialized = true;

        _name = name_;
        _symbol = symbol_;
        minter = minter_;
    }

    function name() public view virtual override returns (string memory) {
        return _name;
    }

    function symbol() public view virtual override returns (string memory) {
        return _symbol;
    }

    /**
     * @notice Mint tokens to a user
     * @param to Recipient address
     * @param amount Amount to mint (in wei, 18 decimals)
     */
    function mint(address to, uint256 amount) external onlyMinter {
        _mint(to, amount);
    }

    /**
     * @notice Burn tokens from caller
     * @param amount Amount to burn
     */
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
}
