#!/bin/bash
# Preseed the market: fund maker, place sell orders on all 8 corners, trigger AMM calibration.
# Usage: ./scripts/seed-market.sh [server_url]
# Requires: server running, fresh market state (delete data/market-state.json first)

SERVER="${1:-http://localhost:3001}"
MAKER="0x41Db99b9A098Af28A06C0af238799c08076Af2f7"
SETS=200
SELL_QTY=50

# Prices roughly reflect: Khamenei ~35%, US ~45%, Israel ~50%
# Sum = 1.00 (valid probability distribution)
CORNERS="000 001 010 011 100 101 110 111"
PRICES="0.08 0.12 0.10 0.15 0.05 0.10 0.12 0.28"

echo "=== Seeding market at $SERVER ==="

# Check current status
STATUS=$(curl -s "$SERVER/api/market/prices" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status','?'))" 2>/dev/null)
echo "Current status: $STATUS"
if [ "$STATUS" != "seeding" ]; then
  echo "Market is not in seeding state. Delete data/market-state.json and restart server first."
  exit 1
fi

# Step 1: Buy complete sets
echo ""
echo "--- Funding $MAKER with $SETS complete sets ---"
curl -s -X POST "$SERVER/api/market/fund" \
  -H 'Content-Type: application/json' \
  -d "{\"user\":\"$MAKER\",\"amount\":$SETS}" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'  Cost: \${d[\"cost\"]}  |  {d[\"message\"]}')"

# Step 2: Place sell orders on all 8 corners
echo ""
echo "--- Placing sell orders ---"
set -- $PRICES
for corner in $CORNERS; do
  PRICE=$1; shift
  RESULT=$(curl -s -X POST "$SERVER/api/market/order" \
    -H 'Content-Type: application/json' \
    -d "{\"user\":\"$MAKER\",\"corner\":\"$corner\",\"side\":\"sell\",\"price\":$PRICE,\"quantity\":$SELL_QTY}")
  MSTATUS=$(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('marketStatus','?'))")
  echo "  $corner @ ${PRICE}  ->  status: $MSTATUS"
done

# Step 3: Place buy (bid) orders from simulated traders to give the book depth
echo ""
echo "--- Placing buy orders (bids) ---"
# Bids slightly below the ask prices to create a spread
# Format: corner:price:qty:user
BIDS="
000:0.06:30:0xTrader1
001:0.10:25:0xTrader2
010:0.08:20:0xTrader1
011:0.12:35:0xTrader3
100:0.03:40:0xTrader2
101:0.07:25:0xTrader1
110:0.09:30:0xTrader3
111:0.24:20:0xTrader2
000:0.05:50:0xTrader3
001:0.08:30:0xTrader1
011:0.10:20:0xTrader2
111:0.20:40:0xTrader1
110:0.07:25:0xTrader2
100:0.02:60:0xTrader3
"
for entry in $BIDS; do
  corner=$(echo "$entry" | cut -d: -f1)
  price=$(echo "$entry" | cut -d: -f2)
  qty=$(echo "$entry" | cut -d: -f3)
  user=$(echo "$entry" | cut -d: -f4)
  curl -s -X POST "$SERVER/api/market/order" \
    -H 'Content-Type: application/json' \
    -d "{\"user\":\"$user\",\"corner\":\"$corner\",\"side\":\"buy\",\"price\":$price,\"quantity\":$qty}" > /dev/null
  echo "  $corner  bid ${price} x${qty}  ($user)"
done

# Step 4: Simulate a few market buys to generate volume + trade history
echo ""
echo "--- Simulating trades ---"
TRADES="
0xAlice:corner:111:5
0xBob:corner:011:3
0xAlice:corner:001:2
0xCharlie:corner:110:4
0xBob:corner:000:6
"
for entry in $TRADES; do
  user=$(echo "$entry" | cut -d: -f1)
  type=$(echo "$entry" | cut -d: -f2)
  corner=$(echo "$entry" | cut -d: -f3)
  amount=$(echo "$entry" | cut -d: -f4)
  RESULT=$(curl -s -X POST "$SERVER/api/market/buy" \
    -H 'Content-Type: application/json' \
    -d "{\"user\":\"$user\",\"type\":\"$type\",\"corner\":\"$corner\",\"amount\":$amount}")
  SHARES=$(echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'{d.get(\"shares\",0):.1f} shares for \${d.get(\"cost\",0):.2f}')" 2>/dev/null)
  echo "  $user bought $corner \$$amount  ->  $SHARES"
done

# Step 5: Verify
echo ""
echo "=== Final state ==="
curl -s "$SERVER/api/market/prices" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(f'Status: {d[\"status\"]}')
print(f'Volume: \${d[\"totalVolume\"]}')
print(f'b: {d[\"b\"]}')
print()
print('Corner prices:')
for c in d['corners']:
    print(f'  {c[\"label\"]}  {c[\"price\"]*100:5.1f}c')
print()
print('Marginals:')
for m in d['marginals']:
    print(f'  {m[\"name\"]:10s}  Yes: {m[\"yes\"]*100:.0f}c  No: {m[\"no\"]*100:.0f}c')
"

echo ""
echo "Done! Market is open for trading."
