const AbstractStrategy = require("./AbstractStrategy");

class HullMovingAverageStrategy extends AbstractStrategy {
    constructor(client) {
        super(client);
    }

    run() {
        this.hullFastLength = indicators.hma(
            this.getCurrentCandleData("close"),
            this.getConfig("fastLength")
        );

        this.hullSlowLength = indicators.hma(
            this.getCurrentCandleData("close"),
            this.getConfig("slowLength")
        );
    }

    isSignalLong() {
        return indicators.crossOver(this.hullFastLength, this.hullSlowLength);
    }

    isSignalShort() {
        return indicators.crossUnder(this.hullFastLength, this.hullSlowLength);
    }

    isProfitOrStopLoss() {
        return false;
    }
}

module.exports = HullMovingAverageStrategy;
