class BinanceWrapper {
    constructor(client) {
        this.client = client;
    }

    fetchExchangeInfo(symbol) {
        this.symbol = symbol;

        this.client.exchangeInfo((err, data) => {
            if (err) {
                console.log(err);
                return;
            }

            let info = data.symbols.find((item) => item.symbol === symbol);

            if (!info) {
                console.log("Symbol " + symbol + " not found.");
                return;
            }

            this.exchangeInfo = info;
        });

        return this;
    }

    listenToChart(interval, candleCount, callback) {
        this.client.futuresChart(
            this.symbol,
            interval,
            (symbol, interval, data) => callback(symbol, interval, data),
            candleCount
        );
    }
}

module.exports = BinanceWrapper;
