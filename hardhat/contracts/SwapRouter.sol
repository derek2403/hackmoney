// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./OutcomeToken.sol";
import "./CornerReceiver.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";

/**
 * @title SwapRouter
 * @notice Main router for prediction market corner token swaps
 * @dev Creates markets with 8 corner tokens and receivers for ETH-based purchasing
 */
contract SwapRouter {
    // All 8 corners for a 3-event market
    string[8] public CORNERS = [
        "000",
        "001",
        "010",
        "011",
        "100",
        "101",
        "110",
        "111"
    ];

    // marketName => corner => OutcomeToken address
    mapping(string => mapping(string => address)) public cornerTokens;

    // marketName => corner => CornerReceiver address
    mapping(string => mapping(string => address)) public cornerReceivers;

    // marketName => exists
    mapping(string => bool) public marketExists;

    // Owner collects ETH
    address public owner;

    event MarketCreated(
        string indexed marketName,
        address[8] tokens,
        address[8] receivers
    );
    event CornerPurchased(
        string indexed marketName,
        string corner,
        address indexed buyer,
        uint256 amount,
        address indexed token
    );

    error MarketAlreadyExists();
    error MarketNotFound();
    error InvalidCorner();

    // Master implementations for cloning
    address public immutable tokenImplementation;
    address public immutable receiverImplementation;

    constructor() {
        owner = msg.sender;

        // Deploy master implementations once
        tokenImplementation = address(new OutcomeToken());
        receiverImplementation = address(new CornerReceiver());
    }

    /**
     * @notice Create a new market with 8 corner tokens and receivers using Clones
     * @param marketName Unique market identifier (e.g., "abc")
     * @return tokens Array of 8 OutcomeToken addresses
     * @return receivers Array of 8 CornerReceiver addresses
     */
    function createMarket(
        string memory marketName
    ) public returns (address[8] memory tokens, address[8] memory receivers) {
        if (marketExists[marketName]) revert MarketAlreadyExists();

        marketExists[marketName] = true;

        for (uint256 i = 0; i < 8; i++) {
            string memory corner = CORNERS[i];

            // 1. Clone OutcomeToken
            string memory tokenName = string.concat(
                "Market ",
                marketName,
                " Corner ",
                corner
            );
            string memory tokenSymbol = string.concat(marketName, "-", corner);

            address tokenAddr = Clones.clone(tokenImplementation);
            OutcomeToken(tokenAddr).initialize(
                tokenName,
                tokenSymbol,
                address(this)
            );

            tokens[i] = tokenAddr;
            cornerTokens[marketName][corner] = tokenAddr;

            // 2. Clone CornerReceiver
            address receiverAddr = Clones.clone(receiverImplementation);
            CornerReceiver(payable(receiverAddr)).initialize(
                address(this),
                marketName,
                corner
            );

            receivers[i] = receiverAddr;
            cornerReceivers[marketName][corner] = receiverAddr;
        }

        emit MarketCreated(marketName, tokens, receivers);
    }

    /**
     * @notice Buy corner tokens with ETH - anyone can call
     * @param marketName Market identifier
     * @param corner Corner identifier (000-111)
     * @param buyer Address to receive tokens
     */
    function buyCorner(
        string memory marketName,
        string memory corner,
        address buyer
    ) public payable {
        if (!marketExists[marketName]) revert MarketNotFound();

        address tokenAddr = cornerTokens[marketName][corner];
        if (tokenAddr == address(0)) revert InvalidCorner();

        // Mint tokens 1:1 with ETH (same decimals: 18)
        OutcomeToken(tokenAddr).mint(buyer, msg.value);

        emit CornerPurchased(marketName, corner, buyer, msg.value, tokenAddr);
    }

    /**
     * @notice Get all corner receiver addresses for a market (for ENS subdomain setup)
     * @param marketName Market identifier
     * @return receivers Array of receiver addresses in order: 000, 001, ..., 111
     */
    function getMarketReceivers(
        string memory marketName
    ) public view returns (address[8] memory receivers) {
        if (!marketExists[marketName]) revert MarketNotFound();

        for (uint256 i = 0; i < 8; i++) {
            receivers[i] = cornerReceivers[marketName][CORNERS[i]];
        }
    }

    /**
     * @notice Get all corner token addresses for a market
     * @param marketName Market identifier
     * @return tokens Array of token addresses in order: 000, 001, ..., 111
     */
    function getMarketTokens(
        string memory marketName
    ) public view returns (address[8] memory tokens) {
        if (!marketExists[marketName]) revert MarketNotFound();

        for (uint256 i = 0; i < 8; i++) {
            tokens[i] = cornerTokens[marketName][CORNERS[i]];
        }
    }

    /**
     * @notice Withdraw collected ETH to owner
     */
    function withdraw() public {
        require(msg.sender == owner, "Only owner");
        (bool success, ) = payable(owner).call{value: address(this).balance}(
            ""
        );
        require(success, "Transfer failed");
    }

    /**
     * @notice Allow contract to receive ETH directly
     */
    receive() external payable {}
}
