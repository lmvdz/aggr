import Exchange from '../exchange'

import Bitmex from './bitmex'
import BinanceFutures from './binance_futures'
import BinanceUs from './binance_us'
import Kraken from './kraken'
import Huobi from './huobi'
import Binance from './binance'
import Bitfinex from './bitfinex'
import Bitstamp from './bitstamp'
import Coinbase from './coinbase'
import Hitbtc from './hitbtc'
import Okex from './okex'
import Poloniex from './poloniex'
import Deribit from './deribit'
import Bybit from './bybit'
import Ftx from './ftx'
import Phemex from './phemex'
import Serum from './serum'

export const exchanges = [
  new Bitmex(),
  new BinanceFutures(),
  new BinanceUs(),
  new Kraken(),
  new Huobi(),
  new Binance(),
  new Bitfinex(),
  new Bitstamp(),
  new Coinbase(),
  new Hitbtc(),
  new Okex(),
  new Poloniex(),
  new Deribit(),
  new Bybit(),
  new Ftx(),
  new Phemex(),
  new Serum()
] as Exchange[]

export function getExchangeById(id: string) {
  for (const exchange of exchanges) {
    if (exchange.id.toLowerCase() === id.toLowerCase()) {
      return exchange
    }
  }

  throw new Error('[worker] failed to get exchange by id "' + id + '"')
}
