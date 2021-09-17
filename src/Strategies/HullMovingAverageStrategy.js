const AbstractStrategy = require("./AbstractStrategy");
const indicators = require("./../Indicators");

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
        const response = indicators.crossOver(
            this.hullFastLength,
            this.hullSlowLength
        );

        return response;
    }

    isSignalShort() {
        const response = indicators.crossUnder(
            this.hullFastLength,
            this.hullSlowLength
        );

        return response;
    }

    isProfitOrStopLoss() {
        if (this.profitTrigger() || this.stopLossTrigger()) {
            return true;
        }

        return this.logger.isCurrentSide("SELL")
            ? this.isSignalLong()
            : this.isSignalShort();
    }
}

module.exports = HullMovingAverageStrategy;
