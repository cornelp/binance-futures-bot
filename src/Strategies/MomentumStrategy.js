const AbstractStrategy = require("./AbstractStrategy.js");
const indicators = require("./../Indicators.js");

class MomentumStrategy extends AbstractStrategy {
    constructor(client) {
        super(client);
    }

    run() {
        this.slowMa = indicators.ema(this.getCurrentCandleData("close"), 200);
        this.fastMa = indicators.ema(this.getCurrentCandleData("close"), 50);
    }

    isSignalShort() {
        const response = indicators.crossUnder(this.fastMa, this.slowMa, 2);

        this.logger.write(`Crossunder status: ${response}`);

        return response;
    }

    isSignalLong() {
        const response = indicators.crossOver(this.fastMa, this.slowMa, 2);

        this.logger.write(`Crossover status: ${response}`);

        return response;
    }

    isProfitOrStopLoss() {
        // if we don't need this feature, simply return false
        // return false;

        let profitPrice = 0;
        let stopLossPrice = 0;
        let status = null;

        if (this.logger.isCurrentSide("BUY")) {
            profitPrice =
                this.logger.get("price") * (1 + this.getConfig("takeProfit"));
            stopLossPrice =
                this.logger.get("price") / (1 + this.getConfig("stopLoss"));

            status =
                profitPrice <= this.getCurrentPrice() ||
                stopLossPrice >= this.getCurrentPrice();
        } else {
            profitPrice =
                this.logger.get("price") / (1 + this.getConfig("takeProfit"));
            stopLossPrice =
                this.logger.get("price") * (1 + this.getConfig("stopLoss"));

            status =
                profitPrice >= this.getCurrentPrice() ||
                stopLossPrice <= this.getCurrentPrice();
        }

        this.logger.write(
            `Price on last action was ${this.logger.get("price")}`,
            `info`
        );

        this.logger.write(`Current price is ${this.getCurrentPrice()}`, `info`);

        this.logger.write(
            `Will take profit at ${profitPrice} and stop loss at ${stopLossPrice}`,
            `info`
        );

        this.logger.write(
            `We ${
                status ? "HAVE" : "DON'T HAVE"
            } one of conditions (stopLoss, profitPrice)`,
            "debug"
        );

        return status;
    }
}

module.exports = MomentumStrategy;
