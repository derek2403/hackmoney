# Prediction Market Swap Router

A system where users can buy prediction market corner tokens by sending ETH directly to ENS subdomains.

## Deployed Contracts (Sepolia)

| Contract | Address |
|----------|---------|
| SwapRouter | `0xEFd7feABc1D820293e5eF988b6715DADd1D26bB2` |

## Architecture

```
User sends ETH to "market-110.jybigbig.eth"
              ↓
    CornerReceiver (knows corner=110)
              ↓
    SwapRouter.buyCorner("market", "110", user)
              ↓
    OutcomeToken("market-110").mint(user, amount)
```

### Contracts

| Contract | Purpose | Per Market |
|----------|---------|------------|
| **SwapRouter** | Central registry, creates markets, mints tokens | 1 (shared) |
| **CornerReceiver** | Receives ETH, forwards to SwapRouter | 8 |
| **OutcomeToken** | ERC-20 representing corner outcome | 8 |

## Corner Naming (3-Event Markets)

Each market has 8 corners representing all outcome combinations:

| Subdomain | Binary | Meaning |
|-----------|--------|---------|
| market-000 | 000 | A=No, B=No, C=No |
| market-001 | 001 | A=No, B=No, C=Yes |
| market-010 | 010 | A=No, B=Yes, C=No |
| market-011 | 011 | A=No, B=Yes, C=Yes |
| market-100 | 100 | A=Yes, B=No, C=No |
| market-101 | 101 | A=Yes, B=No, C=Yes |
| market-110 | 110 | A=Yes, B=Yes, C=No |
| market-111 | 111 | A=Yes, B=Yes, C=Yes |

## How It Works

### Creating a Market

1. User enters market name (e.g., "election")
2. `SwapRouter.createMarket("election")` deploys:
   - 8 OutcomeToken contracts
   - 8 CornerReceiver contracts
3. Frontend creates 8 ENS subdomains pointing to receivers
4. Each subdomain resolves to its unique CornerReceiver

### Buying Corner Tokens

1. User sends ETH to `election-110.jybigbig.eth` via MetaMask
2. ENS resolves to CornerReceiver for corner 110
3. CornerReceiver calls `SwapRouter.buyCorner`
4. SwapRouter mints OutcomeToken to user (1:1 with ETH)

## Smart Contract Functions

### SwapRouter

```solidity
// Create a new market (deploys 16 contracts)
function createMarket(string memory marketName) 
    returns (address[8] tokens, address[8] receivers)

// Buy corner tokens (called by CornerReceiver)
function buyCorner(string memory marketName, string memory corner, address buyer) 
    payable

// Read functions
function marketExists(string memory marketName) view returns (bool)
function getMarketReceivers(string memory marketName) view returns (address[8])
function getMarketTokens(string memory marketName) view returns (address[8])
```

## Development

### Deploy to Sepolia

```bash
cd hardhat
npm install
npx hardhat ignition deploy ignition/modules/SwapRouter.ts --network sepolia
```

### Run Tests

```bash
cd hardhat
npx hardhat test
```

## Frontend Integration

The market creation form is at `/pages/ens.tsx` → "Create Market" tab.

Key files:
- `lib/networkConfig.ts` - Contract addresses
- `lib/abis/SwapRouter.ts` - Contract ABI
- `lib/ens/useMarketSubdomains.ts` - Batch subdomain creation hook
- `components/CreateMarketForm.tsx` - Market creation UI
