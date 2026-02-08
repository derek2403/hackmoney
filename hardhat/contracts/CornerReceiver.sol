// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface ISwapRouter {
    function buyCorner(
        string memory marketName,
        string memory corner,
        address buyer
    ) external payable;
}

/**
 * @title CornerReceiver
 * @notice Minimal contract that receives ETH and forwards to SwapRouter
 * @dev Deployed per corner - knows its market name and corner
 */
contract CornerReceiver {
    ISwapRouter public router;
    string public marketName;
    string public corner;

    error TransferFailed();

    bool public initialized;

    function initialize(
        address router_,
        string memory marketName_,
        string memory corner_
    ) external {
        if (initialized) revert("Already initialized");
        initialized = true;

        router = ISwapRouter(router_);
        marketName = marketName_;
        corner = corner_;
    }

    /**
     * @notice Receives ETH and forwards to SwapRouter to mint corner tokens
     */
    receive() external payable {
        router.buyCorner{value: msg.value}(marketName, corner, msg.sender);
    }

    /**
     * @notice Fallback for calls with data - also forwards ETH
     */
    fallback() external payable {
        router.buyCorner{value: msg.value}(marketName, corner, msg.sender);
    }
}
