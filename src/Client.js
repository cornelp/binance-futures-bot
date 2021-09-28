class Client {
    constructor() {
        this.coins = {};

        this.candleCount = 200;

        return this;
    }

    _setCandleCount(candleCount) {
        if (this.candleCount < candleCount) {
            this.candleCount = candleCount;
        }
    }

    setLogger(logger) {
        this.logger = logger;

        return this;
    }

    addToLog(message, title = null) {
        if (!this.logger) {
            return;
        }

        this.logger.write(message, title);

        console.log(`${message}, ${title || ""}`);
    }

    setStrategies(strategies) {
        this.coins = strategies.reduce((acc, strategy) => {
            // get maximum candle count
            this._setCandleCount(strategy.getConfig("candleCount"));

            strategy.getCoins().forEach((coin) => {
                if (!acc[coin]) acc[coin] = {};

                const interval = strategy.getIntervalForCoin(coin);

                if (!acc[coin][interval]) acc[coin][interval] = [];

                acc[coin][interval].push(strategy);
            });

            return acc;
        }, {});

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
        const coinKeys = Object.keys(this.coins);

        // fetch exchangeInfo
        this.exchangeInfo = await this.exchangeClient.fetchExchangeInfo(
            coinKeys
        );

        while (true) {
            for (let i = 0; i < coinKeys.length; i++) {
                const coin = coinKeys[i];

                this.addToLog("Running", coin);

                const intervals = Object.keys(this.coins[coin]);

                for (let j = 0; j < intervals.length; j++) {
                    const interval = intervals[j];

                    const candleData = await this.exchangeClient.fetchCandle(
                        coin,
                        interval,
                        this.candleCount
                    );

                    this.coins[coin][interval].forEach((strategy) => {
                        strategy.bootstrap(candleData);

                        this._interogate(strategy, coin);
                    });

                    await this._timeout(10 * 1000);
                }
            }
        }
    }

    _interogate(strategy, coin) {
        const stepSize = this.exchangeInfo[coin].stepSize;

        this.addToLog(
            `Interogating ${
                strategy.constructor.name
            }, price is ${strategy.getCurrentPrice()}`
        );

        if (strategy.isInPosition()) {
            this.addToLog(
                "- currently in a position",
                strategy.getLastPosition("symbol")
            );

            this.addToLog(`- TP at ${strategy.getTakeProfitPrice()}`);

            this.addToLog(`- SL at ${strategy.getStopLossPrice()}`);

            if (
                strategy.isCoinInPosition(coin) &&
                strategy.canClosePosition()
            ) {
                const quantity = strategy.getQuantity(coin, stepSize);

                this.addToLog("We can close position", coin);

                if (strategy.getConfig("isTest")) {
                    strategy.setLastPosition(coin, quantity, true);
                    return;
                }

                this.exchangeClient
                    .closePosition(
                        coin,
                        strategy.isCurrentSide("SELL") ? "BUY" : "SELL"
                    )
                    .then(() => strategy.setLastPosition(coin, quantity, true));
            }

            return;
        }

        if (strategy.isSignalLong()) {
            const quantity = strategy.getQuantity(coin, stepSize);
            this.addToLog("Signal is long", coin);

            if (strategy.getConfig("isTest")) {
                strategy.setLastPosition(coin, quantity);
                return;
            }

            this.exchangeClient
                .openLong(coin, quantity)
                .then(() => strategy.setLastPosition(coin, quantity));

            return;
        }

        if (strategy.isSignalShort()) {
            const quantity = strategy.getQuantity(coin, stepSize);
            this.addToLog("Signal is short on", coin);

            if (strategy.getConfig("isTest")) {
                strategy.setLastPosition(coin, quantity);
                return;
            }
            this.exchangeClient
                .openShort(coin, quantity)
                .then(() => strategy.setLastPosition(coin, quantity));
        }
    }
}

module.exports = Client;
