const apiKey = process.env.CMC_KEY || require('../keys/CoinMarketCap.js')

/**
 * API SETUP
 */
const url = 'https://pro-api.coinmarketcap.com/v1'
const quotesUrl = `${ url }/cryptocurrency/quotes/latest`
const endpoints = [
  'fiat',
  'cryptocurrency'
]
const headers = { 'X-CMC_PRO_API_KEY': apiKey }

/**
 * PATHS
 */
const dist = 'dist'
const currenciesPath = `${ dist }/currencies`
const currenciesListPath = `${ currenciesPath }/list`

/**
 * PREFERRED COINS - FOR RATES ONLY
 */
const preferredCryptos = [ 1, 2, 52, 109, 131, 328, 512, 873, 1027, 1274, 1437, 1567, 1759 ]

export default {
  url,
  endpoints,
  headers,
  dist,
  currenciesPath,
  currenciesListPath,
  quotesUrl,
  preferredCryptos
}
