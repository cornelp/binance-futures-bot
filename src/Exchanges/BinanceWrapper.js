const dayjs = require("dayjs");
const Binance = require("binance-api-node").default;

class BinanceWrapper {
  constructor(apiKey, apiSecret) {
    this.client = new Binance({ apiKey, apiSecret });
  }

  fetchCandle(coin) {
    const info = { symbol: coin, interval: "5m", limit: 200 };

    dayjs().format("HH:mm:ss");
    return this.client.futuresCandles(info);
  }

  async fetchExchangeInfo(coins) {
    const exchangeInfo = await this.client.futuresExchangeInfo();

    if (!exchangeInfo.symbols) {
      return;
    }

    return exchangeInfo.symbols
      .filter((item) => coins.indexOf(item.symbol) > -1)
      .reduce((acc, item) => {
        const stepSize = Math.max(
          item.filters[1].stepSize.toString().indexOf("1") - 1,
          0
        );
        const tickSize = Math.max(
          item.filters[0].tickSize.toString().indexOf("1") - 1,
          0
        );

        acc[item.symbol] = {
          minQty: item.filters[1].minQty,
          stepSize,
          tickSize,
        };

        return acc;
      }, {});
  }

  closePosition(coin, quantity) {
    // this.client.futuresOrder
  }

  openLong(coin, quantity) {}

  openShort(coin, quantity) {}
}

module.exports = BinanceWrapper;
