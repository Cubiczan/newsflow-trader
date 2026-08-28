"""Sync DB Decisions with real Alpaca fill status, and emit a proof JSON."""
import sqlite3, json, urllib.request

req = urllib.request.Request(
    "https://paper-api.alpaca.markets/v2/orders?limit=50&status=all",
    headers={
        "APCA-API-KEY-ID": "PKNDK5P66FCRH5P5ILPTVCYE7D",
        "APCA-API-SECRET-KEY": "z1fwAHFV9H8NY26XrZ2sSSxJggc8BwqiU2gPxVsy49V",
    },
)
orders = json.loads(urllib.request.urlopen(req).read())

# Account snapshot
req2 = urllib.request.Request(
    "https://paper-api.alpaca.markets/v2/account",
    headers={
        "APCA-API-KEY-ID": "PKNDK5P66FCRH5P5ILPTVCYE7D",
        "APCA-API-SECRET-KEY": "z1fwAHFV9H8NY26XrZ2sSSxJggc8BwqiU2gPxVsy49V",
    },
)
account = json.loads(urllib.request.urlopen(req2).read())

# Positions snapshot
req3 = urllib.request.Request(
    "https://paper-api.alpaca.markets/v2/positions",
    headers={
        "APCA-API-KEY-ID": "PKNDK5P66FCRH5P5ILPTVCYE7D",
        "APCA-API-SECRET-KEY": "z1fwAHFV9H8NY26XrZ2sSSxJggc8BwqiU2gPxVsy49V",
    },
)
positions = json.loads(urllib.request.urlopen(req3).read())

# Update DB Decisions with real fill status
c = sqlite3.connect('/home/z/my-project/db/custom.db').cursor()
updated = 0
for o in orders:
    oid = o.get('id')
    status = o.get('status')
    avg = o.get('filled_avg_price')
    if not oid:
        continue
    c.execute("SELECT id FROM Decision WHERE orderId = ?", (oid,))
    row = c.fetchone()
    if row:
        new_status = 'FILLED' if status == 'filled' else ('CANCELED' if status == 'canceled' else 'SUBMITTED')
        c.execute(
            "UPDATE Decision SET status = ?, filledPrice = ?, filledAt = ? WHERE id = ?",
            (new_status, float(avg) if avg else None, o.get('filled_at') or o.get('updated_at'), row[0]),
        )
        updated += 1
c.connection.commit()
print(f'updated {updated} decisions with real Alpaca fill status')

# Print final decision table
print('')
print('Final decisions in DB:')
c.execute('SELECT symbol, action, status, qty, orderId, filledPrice FROM Decision ORDER BY createdAt DESC LIMIT 25')
for r in c.fetchall():
    oid_short = r[4][:12] if r[4] else '-'
    print(f'  {r[0]:6s} {r[1]:5s} {r[2]:10s} qty={r[3]} orderId={oid_short} filledPrice={r[5]}')

# Build the proof artifact
filled_orders = [o for o in orders if o.get('status') == 'filled']
proof = {
    "schema": "newsflow-trader-v1",
    "captured_at": account.get('as_of'),
    "hackathon": "Alpaca AI Trading Agents Hackathon — Aug 28 to Sep 4, 2026",
    "agent": {
        "mode": "paper-live",
        "llm_model": "glm-4.6",
        "risk_guard": "maxPositions=5, maxPositionPct=10%, sentimentThreshold=0.55, paperOnly=true",
    },
    "account": {
        "id": account.get('id'),
        "account_number": account.get('account_number'),
        "status": account.get('status'),
        "currency": account.get('currency'),
        "equity": float(account.get('equity')),
        "cash": float(account.get('cash')),
        "buying_power": float(account.get('buying_power')),
        "long_market_value": float(account.get('long_market_value')),
        "short_market_value": float(account.get('short_market_value')),
        "last_equity": float(account.get('last_equity')),
        "daily_pnl": float(account.get('equity')) - float(account.get('last_equity')),
        "daily_pnl_pct": (float(account.get('equity')) / float(account.get('last_equity')) - 1) * 100,
    },
    "positions": [
        {
            "symbol": p.get('symbol'),
            "qty": float(p.get('qty')),
            "side": p.get('side'),
            "avg_entry_price": float(p.get('avg_entry_price')),
            "current_price": float(p.get('current_price')),
            "market_value": float(p.get('market_value')),
            "unrealized_pl": float(p.get('unrealized_pl')),
            "unrealized_plpc": float(p.get('unrealized_plpc')),
        }
        for p in positions
    ],
    "filled_orders_count": len(filled_orders),
    "filled_orders": [
        {
            "symbol": o.get('symbol'),
            "side": o.get('side'),
            "qty": float(o.get('qty')),
            "filled_avg_price": float(o.get('filled_avg_price')) if o.get('filled_avg_price') else None,
            "status": o.get('status'),
            "created_at": o.get('created_at'),
            "filled_at": o.get('filled_at'),
            "order_id": o.get('id'),
            "client_order_id": o.get('client_order_id'),
        }
        for o in filled_orders
    ],
}

# Save to file
out = '/home/z/my-project/download/live-trading-proof.json'
with open(out, 'w') as f:
    json.dump(proof, f, indent=2)
print(f'\nproof artifact written to {out}')
print(f'  filled_orders: {len(filled_orders)}')
print(f'  positions: {len(positions)}')
print(f'  equity: ${proof["account"]["equity"]:,.2f}')
print(f'  daily P&L: ${proof["account"]["daily_pnl"]:+.2f} ({proof["account"]["daily_pnl_pct"]:+.2f}%)')
