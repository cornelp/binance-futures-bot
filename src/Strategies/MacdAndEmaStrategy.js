const AbstractStrategy = require("./AbstractStrategy.js");
const indicators = require("./../Indicators.js");

class MacdAndEmaStrategy extends AbstractStrategy {
    constructor(client) {
        super(client);
    }

    run() {
        this.ema200 = indicators.ema(this.getCurrentCandleData("close"), 200);
        this.macd = indicators.macd(this.getCurrentCandleData("close"));
    }

    isSignalShort() {
        const isCross = indicators.crossunder(this.macd.macd, this.macd.signal);

        return (
            isCross && this.currentPrice > this.ema200[this.ema200.length - 1]
        );
    }

    isSignalLong() {
        const isCross = indicators.crossover(this.macd.macd, this.macd.signal);

        return (
            isCross && this.currentPrice < this.ema200[this.ema200.length - 1]
        );
    }
}

module.exports = MacdAndEmaStrategy;
