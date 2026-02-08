// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title OutcomeToken
 * @notice ERC-20 token representing a specific corner outcome in a prediction market
 * @dev Only the authorized minter (SwapRouter) can mint tokens
 */
contract OutcomeToken is ERC20 {
    address public immutable minter;

    error OnlyMinter();

    modifier onlyMinter() {
        if (msg.sender != minter) revert OnlyMinter();
        _;
    }

    /**
     * @param name_ Token name (e.g., "Market ABC Corner 110")
     * @param symbol_ Token symbol (e.g., "ABC-110")
     * @param minter_ Address authorized to mint (SwapRouter)
     */
    constructor(
        string memory name_,
        string memory symbol_,
        address minter_
    ) ERC20(name_, symbol_) {
        minter = minter_;
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
