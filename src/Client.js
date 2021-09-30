class Client {
    constructor() {
        this.coins = {};
    }

    setLogger(logger) {
        this.logger = logger;

        return this;
    }

    _addToLog(message, title = null) {
        if (!this.logger) {
            return;
        }

        this.logger.write(message, title);

        console.log(`${message}, ${title || ""}`);
    }

    setStrategy(strategy) {
        this.strategy = strategy;

        return this;
    }

    setExchangeClient(wrapper) {
        this.exchangeClient = wrapper;

        return this;
    }

    _timeout(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    async run() {
        const coins = this.strategy.getCoins();

        // check existing positions
        for (let i = 0; i < coins.length; i++) {
            const coin = coins[i];
            const hasPosition = await this.exchangeClient.coinHasPosition(coin);

            this.coins[coin] = { hasPosition };
            console.log("positions", this.coins);
        }

        // get exchangeInfo from exchangeClient
        this.exchangeClient.summary(
            coins,
            this.strategy.getConfig("interval"),
            this.strategy.getConfig("candleCount")
        );

        // run callback when order is filled/partially_filled,
        this.exchangeClient.subscribeToPosition((evt) => {
            const coin = evt.symbol;

            // check event type
            // this.coins[coin].hasPosition = true;
        });

        this.exchangeClient.setOnCandle((candle) => {
            const coin = candle.symbol;

            // stop if we currently have one position on coin
            if (this.coins[coin].hasPosition) {
                return;
            }

            // if data is still gathering, wait for data
            if (!this.exchangeClient.hasCandleDataFor(coin)) {
                return;
            }
            // feed candle data
            this.strategy.bootstrap(this.exchangeClient.getCandleDataFor(coin));

            this._interogate(coin);
        });
    }

    _interogate(coin) {
        if (this.strategy.isSignalLong()) {
            const stepSize = this.exchangeClient.getExchangeInfo(
                coin,
                "stepSize"
            );

            const quantity = this.strategy.getQuantity(coin, stepSize);

            this.exchangeClient.openLong(coin, quantity);

            return;
        }

        if (this.strategy.isSignalShort()) {
            const stepSize = this.exchangeClient.getExchangeInfo(
                coin,
                "stepSize"
            );
            const quantity = this.strategy.getQuantity(coin, stepSize);

            this.exchangeClient.openShort(coin, quantity);
        }
    }
}

module.exports = Client;
