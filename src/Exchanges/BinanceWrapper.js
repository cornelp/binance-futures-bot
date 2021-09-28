const Binance = require("binance-api-node").default;

class BinanceWrapper {
    constructor(apiKey, apiSecret) {
        this.client = new Binance({ apiKey, apiSecret });
    }

    fetchCandle(symbol, interval, limit) {
        const info = { symbol, interval, limit };

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

    closePosition(symbol, side) {
        return this.client.futuresOrder({
            symbol,
            side,
            type: "MARKET",
        });
    }

    openLong(coin, quantity) {
        return this.client.futuresOrder({
            symbol: coin,
            side: "BUY",
            type: "MARKET",
            quantity,
        });
    }

    openShort(coin, quantity) {
        return this.client.futuresOrder({
            symbol: coin,
            side: "SELL",
            type: "MARKET",
            quantity,
        });
    }
}

module.exports = BinanceWrapper;
