class Client {
    constructor() {
        this.coins = {};
    }

    setLogger(logger) {
        this.logger = logger;

        return this;
    }

    setStrategy(strategy) {
        this.strategy = strategy;

        return this;
    }

    setExchangeClient(wrapper) {
        this.exchangeClient = wrapper;

        return this;
    }

    async run() {
        const coins = this.strategy.getCoins();

        // check existing positions
        // also orders
        for (let i = 0; i < coins.length; i++) {
            const coin = coins[i];
            const hasPosition = await this.exchangeClient.coinHasPosition(coin);
            const hasOrder = await this.exchangeClient.coinHasOrder(coin);

            this.coins[coin] = { hasPosition, hasOrder };
        }

        console.log(this.coins);

        // get exchangeInfo from exchangeClient
        this.exchangeClient.summary(
            coins,
            this.strategy.getConfig("interval"),
            this.strategy.getConfig("candleCount")
        );

        // run callback when order is filled/partially_filled,
        this.exchangeClient.subscribeToPosition(async (evt) => {
            const coin = evt.symbol;

            // if we have one order filled
            // if the coin on map does not have hasPosition
            //      - set hasPosition: true and hasOrder: false
            // if the coin on map hasPosition
            //      - that means that the position is gone
            //      - we can make hasPosition: false and hasOrder: false

            // if the coin is not within our strategy
            if (!this.coins[coin]) {
                return;
            }

            // actually here we're checking if it had a position
            // and filled event changed that
            if (!this.coins[coin].hasPosition) {
                // it means that the newly position was filled
                this.coins[coin] = {
                    hasPosition: true,
                    hasOrder: false,
                    order: evt,
                };
            } else {
                // get all remaining orders for that specific coin
                // cancel remaining orders
                const orders = await this.exchangeClient.getOpenedOrders(coin);

                if (orders && orders.length) {
                    orders.forEach((order) => {
                        // we don't need to wait for the transaction to finish - so no await
                        this.exchangeClient.cancelOrder(coin, order.orderId);
                    });
                }

                // save a clean object
                this.coins[coin] = { hasPosition: false, hasOrder: false };
            }

            // save the output somewhere
            this.strategy.logTransaction({
                status: this.coins[coin].hasPosition ? "Started" : "Closed",
                coin,
                price: parseFloat(evt.price).toFixed(2),
                type: evt.side,
            });

            // if the position is opened now, add TP/SL
            if (this.coins[coin].hasPosition) {
                const stopLossPrice = this.strategy.getStopLossPrice(
                    evt.price,
                    evt.side === "BUY" ? -1 : 1
                );

                this.strategy.logTransaction({
                    status: "stopLossPrice",
                    coin,
                    price: stopLossPrice,
                    type: evt.side,
                });

                await this.exchangeClient.addStopLoss(coin, stopLossPrice, evt);

                const profitPrice = this.strategy.getTakeProfitPrice(
                    evt.price,
                    evt.side === "BUY" ? 1 : -1
                );

                this.strategy.logTransaction({
                    status: "takeProfit",
                    coin,
                    price: profitPrice,
                    type: evt.side,
                });

                await this.exchangeClient.addTakeProfit(coin, profitPrice, evt);
            }
        });

        this.exchangeClient.setOnCandle((candle) => {
            const coin = candle.symbol;

            // stop if we currently have one position on coin
            if (this.coins[coin].hasPosition || this.coins[coin].hasOrder) {
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
            console.log(
                "signal is long, price",
                this.strategy.getCurrentPrice()
            );

            this.exchangeClient.openLong(coin, this.strategy.getAmount());

            return;
        }

        if (this.strategy.isSignalShort()) {
            console.log(
                "signal is short, price",
                this.strategy.getCurrentPrice()
            );

            this.exchangeClient.openShort(coin, this.strategy.getAmount());
        }
    }
}

module.exports = Client;
