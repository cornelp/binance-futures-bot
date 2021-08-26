const AbstractStrategy = require("./AbstractStrategy");

class MomentumStrategy extends AbstractStrategy {
    isPriceRightForBuy() {
        // make an average for last X prices
        // compare that to the current price
        //
        // if RSI is OK
        // and the current price is below average with X%,
        // and the last Y prices are growing (growth is Z%)
        //
        // make the buy

        // make average of current prices
        let sum = this.previousPrices.reduce((acc, item) => (acc += item), 0);
        let averagePrice = sum / this.previousPrices.length;

        console.log("average price is " + averagePrice);

        // when we don't have a complete history
        if (
            this.previousPrices.length < this.config.previousPricesNo ||
            isNaN(averagePrice) ||
            !this.rsi
        ) {
            return false;
        }

        if (
            this.rsi.value <= this.config.overSold ||
            this.rsi.value >= this.config.overBought
        ) {
            console.log("RSI is too low/high");

            return false;
        }

        currentProfit =
            ((this.currentPrice - averagePrice) / averagePrice) * 100;

        console.log("current margin is " + currentProfit);
        console.log(
            "are last prices on upper trend: " +
                this.areLastPricesOnUpperTrend()
        );

        return (
            currentProfit >= parseFloat(this.config.marginTrigger) &&
            this.areLastPricesOnUpperTrend()
        );
    }

    areLastPricesOnUpperTrend() {
        let previousPrices = this.previousPrices.slice(
            (this.config.pricesNoForTrendCalculation + 1) * -1
        );

        if (previousPrices.length < this.config.pricesNoForTrendCalculation) {
            return false;
        }

        return previousPrices.every((el, index, arr) => {
            let nextEl = arr[index + 1];

            return !nextEl || el <= nextEl;
        });
    }

    isPriceRightForSell(lastPosition) {
        // if we're on a profit (X%)
        // and RSI is close to overBought
        // and last Y prices are going down (Z%)
        //
        // sell

        const currentProfit =
            ((this.currentPrice - lastPosition.price) / lastPosition.price) *
            100;

        let stopLoss = currentProfit < 0 ? currentProfit * -1 : 0;

        if (
            currentProfit <= this.config.takeProfit &&
            stopLoss <= this.config.stopLoss
        ) {
            return false;
        }

        return this.areLastPricesOnLowerTrend();
    }

    areLastPricesOnLowerTrend() {
        let previousPrices = this.previousPrices.slice(
            (this.config.pricesNoForTrendCalculation + 1) * -1
        );

        if (previousPrices.length < this.config.pricesNoForTrendCalculation) {
            return false;
        }

        return previousPrices.every((el, index, arr) => {
            let previousEl = arr[index - 1];

            return !previousEl || el <= previousEl;
        });
    }

    calculateRSI() {
        const rs = Object.keys(this.candleData).reduce(
            (acc, key) => {
                if (this.candleData[key].open > this.candleData[key].close) {
                    acc.loss++;
                }

                if (this.candleData[key].open < this.candleData[key].close) {
                    acc.gain++;
                }

                return acc;
            },
            { gain: 0, loss: 0 }
        );

        let rsi =
            100 -
            100 /
                (1 +
                    rs.gain /
                        this.config.candleCount /
                        (rs.loss / this.config.candleCount));

        this.rsi = { value: rsi, timestamp: this.lastTimestamp };

        console.log(this.rsi);
    }

    getRSI() {
        return this.rsi;
    }
}

module.exports = MomentumStrategy;
