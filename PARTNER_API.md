# Suimfx Partner API — Trades Feed

Read-only feed of live (open) and closed positions.

**A-Book only.** The feed carries real-money trades that were hedged out to a
liquidity provider. Demo accounts and B-Book (internal) trades never appear.

Each API key is scoped to one broker, so the key you were given returns that
broker's trades and nothing else.

## Auth

Send the API key on every request, either way:

```
X-API-Key: YOUR_API_KEY
```
```
Authorization: Bearer YOUR_API_KEY
```

Server-to-server only. Do not put the key in browser JavaScript — anyone
viewing the page source can read it. Call this from your backend and serve
the result to your own page.

## Endpoint

```
GET https://api.suimfx.com/api/v1/trades
```

### Query parameters

| Param    | Default | Notes |
|----------|---------|-------|
| `status` | `all`   | `open` = live positions, `closed` = closed positions, `all` = both |
| `days`   | `30`    | Look-back window, max `90`. Filters on the trade's open time. |
| `from`   | —       | ISO date, overrides `days` |
| `to`     | —       | ISO date |
| `limit`  | `100`   | Max `500` |
| `offset` | `0`     | For paging; use with `total` in the response |

### Example

```bash
curl -H "X-API-Key: YOUR_API_KEY" \
  "https://api.suimfx.com/api/v1/trades?status=all&days=30&limit=100"
```

### Response

```json
{
  "success": true,
  "data": [
    {
      "trade_id": "T4839211",
      "username": "ACC100234",
      "symbol": "EURUSD",
      "position": "Buy",
      "lot_size": 0.10,
      "used_margin": 100.00,
      "open_amount": 1000.00,
      "close_amount": 1050.00,
      "pnl": 50.00,
      "open_datetime": "2026-08-17T10:30:00.000Z",
      "close_datetime": "2026-08-17T12:45:00.000Z",
      "status": "Closed"
    },
    {
      "trade_id": "T4839555",
      "username": "ACC100234",
      "symbol": "BTCUSD",
      "position": "Sell",
      "lot_size": 0.05,
      "used_margin": 250.00,
      "open_amount": 2500.00,
      "close_amount": null,
      "pnl": -18.40,
      "open_datetime": "2026-08-17T14:00:00.000Z",
      "close_datetime": null,
      "status": "Open"
    }
  ],
  "total": 842,
  "limit": 100,
  "offset": 0
}
```

## Field reference

| Field | Meaning |
|-------|---------|
| `trade_id` | Unique id for the trade. Use it to de-duplicate on repeat polls. |
| `username` | Trading account id. Emails and real names are never exposed. |
| `symbol` | Instrument, e.g. `EURUSD`, `BTCUSD`, `XAUUSD` |
| `position` | `Buy` or `Sell` |
| `lot_size` | Volume traded, in lots — `0.10` is a tenth of a standard lot |
| `used_margin` | Margin locked for this position, in account currency |
| `open_amount` | Position value at open, in account currency: `open price × lots × contract size` |
| `close_amount` | Same at close. `null` while the position is still open. |
| `pnl` | Realised P&L for closed trades; live floating P&L for open ones. Negative = loss. |
| `open_datetime` | ISO 8601 UTC |
| `close_datetime` | ISO 8601 UTC. `null` while the position is still open. |
| `status` | `Open` or `Closed` |

## Errors

| Code | Meaning |
|------|---------|
| `401` | Missing or invalid API key |
| `400` | Bad `from` / `to` date |
| `503` | Feed not configured on the server |

## Notes

- A-Book trades only. Demo, B-Book and prop/challenge trades are excluded.
- Your key is scoped to a single broker; you cannot see other brokers' trades.
- `pnl` on open positions moves with the market. Poll every 5-15s for a live board.
- Newest first, sorted by open time.
