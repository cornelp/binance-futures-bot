const AbstractStrategy = require("./AbstractStrategy.js");
const indicators = require("./../Indicators.js");

class MacdAndEmaStrategy extends AbstractStrategy {
    constructor(client) {
        super(client);
    }

    run() {
        this.ema200 = indicators.ema(this.getCurrentCandleData("close"), 200);
        this.macd = indicators.macd(this.getCurrentCandleData("close"));

        this.isCrossUnder = indicators.crossUnder(
            this.macd.macd,
            this.macd.signal
        );

        this.isCrossOver = indicators.crossOver(
            this.macd.macd,
            this.macd.signal
        );
    }

    isSignalShort() {
        return (
            this.isCrossUnder &&
            this.currentPrice > this.ema200[this.ema200.length - 1]
        );
    }

    isSignalLong() {
        return (
            this.isCrossOver &&
            this.currentPrice < this.ema200[this.ema200.length - 1]
        );
    }
}

module.exports = MacdAndEmaStrategy;
