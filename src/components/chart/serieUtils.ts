/**
 * get 1 ohlc bar out of actives exchanges in bar
 * simple average
 * @param {Renderer} renderer
 */
export function avg_ohlc$(state, renderer) {
  let nbSources = 0
  let setOpen = false

  if (typeof state.open === 'undefined') {
    setOpen = true
    state.open = 0
  }

  state.high = 0
  state.low = 0
  state.close = 0

  for (const identifier in renderer.sources) {
    if (renderer.sources[identifier].open === null) {
      continue
    }

    if (setOpen) {
      state.open += renderer.sources[identifier].open
    }

    state.high += renderer.sources[identifier].high
    state.low += renderer.sources[identifier].low
    state.close += renderer.sources[identifier].close

    nbSources++
  }

  if (!nbSources) {
    nbSources = 1
  }

  if (setOpen) {
    state.open /= nbSources
  }

  state.high /= nbSources
  state.low /= nbSources
  state.close /= nbSources

  return { time: renderer.localTimestamp, open: state.open, high: state.high, low: state.low, close: state.close }
}

/**
 * get 1 ohlc bar out of actives exchanges in bar
 * simple average
 * @param {Renderer} renderer
 */
export function avg_close$(state, renderer) {
  let nbSources = 0

  state.close = 0

  for (const identifier in renderer.sources) {
    if (renderer.sources[identifier].open === null) {
      continue
    }

    state.close += renderer.sources[identifier].close

    nbSources++
  }

  if (!nbSources) {
    nbSources = 1
  }

  state.close /= nbSources

  return state.close
}

/**
 * get 1 ohlc bar out of actives exchanges in bar
 * simple average
 * @param {Renderer} renderer
 */
export function ohlc$(state, value, time) {
  if (typeof state.open === 'undefined') {
    state.open = value
    state.high = value
    state.low = value
  }

  state.high = Math.max(state.high, value)
  state.low = Math.min(state.low, value)
  state.close = value

  return { time: time, open: state.open, high: state.high, low: state.low, close: state.close }
}

/**
 * get 1 ohlc bar out of actives exchanges in bar
 * simple average
 * @param {Renderer} renderer
 */
export function cum_ohlc$(state, value, time) {
  if (typeof state.open === 'undefined') {
    state.open = value
    state.high = value
    state.low = value
  } else {
    value = state.open + value
  }

  state.high = Math.max(state.high, value)
  state.low = Math.min(state.low, value)
  state.close = value

  return { time: time, open: state.open, high: state.high, low: state.low, close: state.close }
}

/**
 * get 1 ohlc bar out of actives exchanges in bar
 * simple average
 * @param {Renderer} renderer
 */
export function cum$(state, value) {
  if (typeof state.open === 'undefined') {
    state.open = value
  }

  state.close = state.open + value

  return state.close
}

/**
 * Highest value state
 */
export const highest = {
  count: 0,
  points: []
}
/**
 * get highest value
 * @param {SerieMemory} memory
 * @param {number} value
 */
export function highest$(state, value) {
  state.output = value

  if (state.count) {
    return Math.max.apply(null, state.points)
  } else {
    return value
  }
}

/**
 * Lowest value state
 */
export const lowest = {
  count: 0,
  points: []
}
/**
 * Lowest value
 * @param {SerieMemory} memory
 * @param {number} value
 */
export function lowest$(state, value) {
  state.output = value

  if (state.count) {
    return Math.min.apply(null, state.points)
  } else {
    return value
  }
}

/**
 * Linear Regression state
 */
export const linreg = {
  count: 0,
  sum: 0,
  points: []
}

/**
 * Linear Regression
 * @param state
 * @param value
 * @param length
 * @returns
 */
export function linreg$(state, value, length) {
  state.output = value

  if (state.count < 1) {
    return null
  }

  let count = 0
  let per = 0
  let sumX = 0
  let sumY = 0
  let sumXSqr = 0
  let sumXY = 0

  for (let i = 0; i <= state.points.length; i++) {
    const val = i === state.points.length ? value : state.points[i]
    per = i + 1
    sumX += per
    sumY += val
    sumXSqr += per * per
    sumXY += val * per
    count++
  }

  const slope = (count * sumXY - sumX * sumY) / (count * sumXSqr - sumX * sumX)
  const average = sumY / count
  const intercept = average - (slope * sumX) / length + slope

  return intercept + slope * (count - 1)
}

/**
 * get avg
 * @param {SerieMemory} memory
 * @param {number[]} values
 */
export function avg$(state, values) {
  let count = 0
  let sum = 0

  for (let i = 0; i < values.length; i++) {
    if (values[i] === null) {
      continue
    }
    sum += values[i]
    count++
  }

  return sum / count
}

/**
 * sum state
 */
export const sum = {
  count: 0,
  sum: 0,
  points: []
}
/**
 * sum
 * @param {SerieMemory} memory
 * @param {number} value
 */
export function sum$(state, value) {
  state.output = value
  return state.sum + value
}

/**
 * simple moving average (SMA) state
 */
export const sma = {
  count: 0,
  sum: 0,
  points: []
}
/**
 * simple moving average (SMA)
 * @param {SerieMemory} memory
 * @param {number} value
 */
export function sma$(state, value) {
  const average = (state.sum + value) / (state.count + 1)
  state.output = value
  return average
}

/**
 * cumulative moving average (CMA) state
 */
export const cma = {
  count: 0,
  sum: 0,
  points: []
}
/**
 * cumulative moving average (CMA)
 * @param {SerieMemory} memory
 * @param {number} value
 */
export function cma$(state, value) {
  state.output = (state.sum + value) / (state.count + 1)
  return state.output
}

/**
 * exponential moving average (EMA) state
 */
export const ema = {
  count: 0,
  sum: 0,
  points: []
}
/**
 * exponential moving average
 * @param {SerieMemory} memory
 * @param {number} value
 */
export function ema$(state, value, length) {
  const k = 2 / (length + 1)

  if (state.count) {
    const last = state.points[state.points.length - 1]
    state.output = (value - last) * k + last
  } else {
    state.output = value
  }

  return state.output
}


export const mfi = {
  count: 0,
  pmf1: [],
  nmf1: [],
  pmf14: 0,
  nmf14: 0,
  points: []
}

// https://school.stockcharts.com/doku.php?id=technical_indicators:money_flow_index_mfi
export function mfi$(state, price, candle, length) {

  enum MoneyFlowDirection {
    Positive,
    Negative
  }

  interface RawMoneyFlow {
    direction: MoneyFlowDirection,
    typicalPrice: number,
    rawMoneyFlow: number
  }

  const typicalPrice$ = (high : number, low : number, close : number) => {
    return (high + low + close / 3)
  }

  const moneyFlowRatio$ = (pmf14, nmf14) => {
    return (( nmf14 !== 0 )? (pmf14 / nmf14) : 0)
  }

  const moneyFlowIndex$ = (moneyFlowRatio: number) => {
    return (100 - (100/(1 + moneyFlowRatio)))
  }

  const volume = {
      buy: candle.bar.vbuy,
      sell: candle.bar.vsell
  }

  const absVolume = Math.abs(volume.buy - volume.sell)
  const typicalPrice = typicalPrice$(price.high, price.low, price.close)
  if (!state.rmf) {
    state.rmf = {
      typicalPrice: typicalPrice,
      rawMoneyFlow: typicalPrice * absVolume,
      direction: ((price.open < price.close) ? MoneyFlowDirection.Positive : MoneyFlowDirection.Negative)
    } as RawMoneyFlow
  } else {
    state.rmf = {
      typicalPrice: typicalPrice,
      rawMoneyFlow: typicalPrice * absVolume,
      direction: ((state.rmf.typicalPrice > typicalPrice) ? MoneyFlowDirection.Negative : MoneyFlowDirection.Positive)
    }
  }
  



  

  if (state.rmf.direction === MoneyFlowDirection.Positive) {
    state.pmf1[state.count] = state.rmf.rawMoneyFlow
  } else if (state.rmf.direction === MoneyFlowDirection.Negative) {
    state.nmf1[state.count] = state.rmf.rawMoneyFlow
  }

  

  if (state.count >= length) {
    if (state.count === length) {
      const reducedpmf1 = state.pmf1.filter(a => a).reduce((a, b) => a += b);
      const reducednmf1 = state.nmf1.filter(a => a).reduce((a, b) => a += b);
      // console.log(reducedpmf1, reducednmf1)
      state.pmf14 = reducedpmf1
      state.nmf14 = reducednmf1
    } else {
      // add mf1 value
      state.pmf14 += state.count in state.pmf1 ? state.pmf1[state.count] : 0
      state.nmf14 += state.count in state.nmf1 ? state.nmf1[state.count] : 0
      // remove oldest mf1 value
      state.pmf14 -= (state.count - length) in state.pmf1 ? state.pmf1[state.count - length] : 0
      state.nmf14 -= (state.count - length) in state.nmf1 ? state.nmf1[state.count - length] : 0

      state.pmf1.splice(0, state.pmf1.length - length+1)
      state.nmf1.splice(0, state.pmf1.length - length+1)
    }
    state.output = moneyFlowIndex$(moneyFlowRatio$(state.pmf14, state.nmf14))
  } else {
    state.output = 0
  }
  // console.log(state.count, length, state.count - length, state.pmf14[state.count], state.pmf1[state.count], state.nmf14[state.count], state.nmf1[state.count])

  return state.output;
}
