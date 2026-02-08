/**
 * ENS Event Listener — polls SwapRouter for CornerPurchased events
 * and triggers market buys on the CLOB server.
 *
 * The SwapRouter emits CornerPurchased when someone sends ETH to a
 * CornerReceiver (ENS subdomain). This listener picks it up and
 * calls POST /api/market/buy to fill against the order book.
 */

const { createPublicClient, http } = require('viem');
const { sepolia } = require('viem/chains');
const fs = require('fs');
const path = require('path');
const http_module = require('http');

const ADDRESSES_PATH = path.join(__dirname, '..', '..', 'data', 'addresses.json');

// How many blocks to look back on first startup (~2 hours on Sepolia)
const LOOKBACK_BLOCKS = 500n;

// ABI for the CornerPurchased event
const CORNER_PURCHASED_EVENT = {
  type: 'event',
  name: 'CornerPurchased',
  inputs: [
    { name: 'marketName', type: 'string', indexed: true },
    { name: 'corner', type: 'string', indexed: false },
    { name: 'buyer', type: 'address', indexed: true },
    { name: 'amount', type: 'uint256', indexed: false },
    { name: 'token', type: 'address', indexed: true },
  ],
};

/**
 * Load addresses config from data/addresses.json.
 */
function loadConfig() {
  try {
    const raw = fs.readFileSync(ADDRESSES_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    console.error('[ENS Listener] Failed to load addresses.json:', e.message);
    return null;
  }
}

/**
 * Register a session for an ENS buyer (credits them USD so the buy can proceed).
 */
function postSession(port, user, addBalance) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ user, addBalance });
    console.log(`[ENS Listener] POST /api/market/session payload:`, data);
    const req = http_module.request(
      {
        hostname: '127.0.0.1',
        port,
        path: '/api/market/session',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          console.log(`[ENS Listener] Session response (${res.statusCode}):`, body);
          try { resolve(JSON.parse(body)); } catch { resolve({ raw: body }); }
        });
      }
    );
    req.on('error', (err) => {
      console.error(`[ENS Listener] Session HTTP error:`, err.message);
      reject(err);
    });
    req.write(data);
    req.end();
  });
}

/**
 * Make a POST request to the CLOB server's market buy endpoint.
 */
function postBuy(port, buyPayload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(buyPayload);
    console.log(`[ENS Listener] POST /api/market/buy payload:`, data);
    const req = http_module.request(
      {
        hostname: '127.0.0.1',
        port,
        path: '/api/market/buy',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          console.log(`[ENS Listener] Buy response (${res.statusCode}):`, body);
          try {
            resolve(JSON.parse(body));
          } catch {
            resolve({ raw: body });
          }
        });
      }
    );
    req.on('error', (err) => {
      console.error(`[ENS Listener] HTTP request error:`, err.message);
      reject(err);
    });
    req.write(data);
    req.end();
  });
}

/**
 * Start the ENS event listener.
 * Polls every pollIntervalMs for new CornerPurchased events on the SwapRouter,
 * then calls POST /api/market/buy on the CLOB server for each.
 *
 * @param {number} serverPort - The CLOB server port (e.g. 3001)
 */
function startENSListener(serverPort) {
  const config = loadConfig();
  if (!config || !config.swapRouter) {
    console.error('[ENS Listener] No swapRouter in addresses.json — listener disabled');
    return;
  }

  const pollInterval = config.pollIntervalMs || 15000;
  const defaultAmount = config.defaultBuyAmount || 10;

  const client = createPublicClient({
    chain: sepolia,
    transport: http(config.rpcUrl || 'https://ethereum-sepolia-rpc.publicnode.com'),
  });

  // Track processed tx hashes to avoid double-buying
  const processedTxs = new Set();
  let lastBlock = 0n;
  let pollCount = 0;

  console.log('==============================================');
  console.log('[ENS Listener] Starting...');
  console.log(`[ENS Listener] SwapRouter: ${config.swapRouter}`);
  console.log(`[ENS Listener] RPC URL: ${config.rpcUrl || 'https://ethereum-sepolia-rpc.publicnode.com'}`);
  console.log(`[ENS Listener] Chain: Sepolia (${config.chainId || 11155111})`);
  console.log(`[ENS Listener] Poll interval: ${pollInterval}ms`);
  console.log(`[ENS Listener] Default buy amount: $${defaultAmount}`);
  console.log(`[ENS Listener] Lookback: ${LOOKBACK_BLOCKS} blocks`);
  console.log(`[ENS Listener] CLOB server port: ${serverPort}`);
  console.log('==============================================');

  async function poll() {
    pollCount++;
    const ts = new Date().toISOString();
    try {
      // Re-read config each poll so contract address can be updated live
      const currentConfig = loadConfig();
      if (!currentConfig || !currentConfig.swapRouter) {
        console.log(`[ENS Listener] [${ts}] Poll #${pollCount}: no config, skipping`);
        return;
      }

      const latestBlock = await client.getBlockNumber();

      // On first run, look back LOOKBACK_BLOCKS to catch recent events
      if (lastBlock === 0n) {
        lastBlock = latestBlock > LOOKBACK_BLOCKS ? latestBlock - LOOKBACK_BLOCKS : 0n;
        console.log(`[ENS Listener] [${ts}] First poll: scanning from block ${lastBlock} to ${latestBlock} (${latestBlock - lastBlock} blocks)`);
      }

      // Nothing new
      if (latestBlock <= lastBlock) {
        console.log(`[ENS Listener] [${ts}] Poll #${pollCount}: no new blocks (at ${latestBlock})`);
        return;
      }

      const fromBlock = lastBlock + 1n;
      console.log(`[ENS Listener] [${ts}] Poll #${pollCount}: scanning blocks ${fromBlock} to ${latestBlock}`);

      // Get CornerPurchased logs from the SwapRouter
      const logs = await client.getLogs({
        address: currentConfig.swapRouter,
        event: CORNER_PURCHASED_EVENT,
        fromBlock,
        toBlock: latestBlock,
      });

      lastBlock = latestBlock;

      if (logs.length === 0) {
        console.log(`[ENS Listener] [${ts}] Poll #${pollCount}: no CornerPurchased events found`);
        return;
      }

      console.log(`[ENS Listener] [${ts}] Found ${logs.length} CornerPurchased event(s)!`);

      for (const log of logs) {
        const txHash = log.transactionHash;

        // Skip already processed
        if (processedTxs.has(txHash)) {
          console.log(`[ENS Listener] Skipping already-processed tx: ${txHash}`);
          continue;
        }
        processedTxs.add(txHash);

        // Keep set bounded (last 1000)
        if (processedTxs.size > 1000) {
          const first = processedTxs.values().next().value;
          processedTxs.delete(first);
        }

        // Log the raw event for debugging
        console.log(`[ENS Listener] Raw event args:`, JSON.stringify(log.args, (_, v) => typeof v === 'bigint' ? v.toString() : v));
        console.log(`[ENS Listener] Block: ${log.blockNumber}, Tx: ${txHash}`);

        const { corner, buyer, amount } = log.args;
        const amountEth = Number(amount) / 1e18;

        console.log(`[ENS Listener] Decoded: buyer=${buyer} corner=${corner} amount=${amountEth} ETH`);

        // Validate corner is a valid 3-char binary string
        if (!corner || !/^[01]{3}$/.test(corner)) {
          console.error(`[ENS Listener] Invalid corner "${corner}", skipping`);
          continue;
        }

        // Register/credit session for the ENS buyer so they have USD to spend
        const buyAmount = currentConfig.defaultBuyAmount || defaultAmount;
        try {
          await postSession(serverPort, buyer, buyAmount);
        } catch (err) {
          console.error(`[ENS Listener] Session registration error:`, err.message);
        }

        // Buy on the CLOB order book at market price
        try {
          const result = await postBuy(serverPort, {
            user: buyer,
            type: 'corner',
            corner: corner,
            amount: buyAmount,
          });

          if (result.error) {
            console.error(`[ENS Listener] Buy FAILED: ${result.error}`);
          } else {
            console.log(`[ENS Listener] Buy SUCCESS: ${buyer} corner ${corner} — ${result.shares} shares for $${result.cost}`);
          }
        } catch (err) {
          console.error(`[ENS Listener] HTTP error:`, err.message);
        }
      }
    } catch (err) {
      console.error(`[ENS Listener] [${ts}] Poll #${pollCount} error:`, err.message);
    }
  }

  // Start polling
  poll();
  const intervalId = setInterval(poll, pollInterval);

  // Return cleanup function
  return () => clearInterval(intervalId);
}

module.exports = { startENSListener };
