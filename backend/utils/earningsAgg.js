// Shared aggregation helpers for spread → dollar earnings.
// Trade.spread historically stored the raw config value (pips/cents/USD); new trades also store
// `spreadEarning` directly in dollars. This pipeline stage produces `_spreadDollars` consistently
// across both shapes, so all earnings reports can $sum '$_spreadDollars' without a backfill.

const CRYPTO_SYMBOLS = ['BTCUSD','ETHUSD','LTCUSD','XRPUSD','BCHUSD','BNBUSD','SOLUSD','ADAUSD',
  'DOGEUSD','DOTUSD','MATICUSD','AVAXUSD','LINKUSD','SHIBUSD','XLMUSD','TRXUSD','UNIUSD','ATOMUSD',
  'ETCUSD','FILUSD','ICPUSD','VETUSD','NEARUSD','GRTUSD','AAVEUSD','MKRUSD','ALGOUSD','FTMUSD',
  'SANDUSD','MANAUSD','AXSUSD','THETAUSD','XMRUSD','SNXUSD','EOSUSD','CHZUSD','PEPEUSD','ARBUSD',
  'OPUSD','SUIUSD','APTUSD','INJUSD','TONUSD','HBARUSD','ENJUSD']

const METAL_SYMBOLS = ['XAUUSD','XAGUSD','XPTUSD','XPDUSD','XAUEUR','XAUAUD','XAUGBP','XAUCHF',
  'XAUJPY','XAGEUR','XAGAUD','XAGGBP']

export const SPREAD_DOLLARS_STAGE = {
  $addFields: {
    _spreadDollars: {
      $cond: [
        { $gt: [{ $ifNull: ['$spreadEarning', 0] }, 0] },
        '$spreadEarning',
        {
          $multiply: [
            { $ifNull: ['$spread', 0] },
            { $ifNull: ['$quantity', 0] },
            { $ifNull: ['$contractSize', 0] },
            {
              $switch: {
                branches: [
                  { case: { $eq: ['$segment', 'Crypto'] }, then: 1 },
                  { case: { $in: ['$symbol', CRYPTO_SYMBOLS] }, then: 1 },
                  { case: { $eq: ['$segment', 'Metals'] }, then: 0.01 },
                  { case: { $in: ['$symbol', METAL_SYMBOLS] }, then: 0.01 },
                  { case: { $regexMatch: { input: { $ifNull: ['$symbol', ''] }, regex: 'JPY' } }, then: 0.01 }
                ],
                default: 0.0001
              }
            }
          ]
        }
      ]
    }
  }
}
