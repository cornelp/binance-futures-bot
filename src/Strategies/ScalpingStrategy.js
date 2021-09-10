const AbstractStrategy = require("./AbstractStrategy.js");
const indicators = require("./../Indicators.js");
const fs = require("fs");

class ScalpingStrategy extends AbstractStrategy {
    constructor(client) {
        super(client);
    }

    run() {
        // get sma 5
        const line5 = indicators.sma(this.getCurrentCandleData("close"), 5);
        // get sma 8
        const line8 = indicators.sma(this.getCurrentCandleData("close"), 8);
        // get sma 13
        const line13 = indicators.sma(this.getCurrentCandleData("close"), 13);

        this.crossOver =
            indicators.crossover(line5, line8) &&
            indicators.crossover(line5, line13);

        this.crossUnder =
            indicators.crossunder(line5, line8) &&
            indicators.crossunder(line5, line13);

        console.log(
            "cross over",
            this.crossOver,
            "cross under",
            this.crossUnder
        );
    }

    isSignalLong() {
        // when 5 line crosses up on the other two
        return this.crossOver;
    }

    isSignalShort() {
        // when 5 line crosses down on the other two
        return this.crossUnder;
    }

    isProfitOrStopLoss() {
        const currentPrice = parseFloat(this.getCurrentPrice());

        const profitAmount = parseFloat(
            this.logger.get("price") * this.getConfig("takeProfit")
        );
        const profitPrice =
            parseFloat(this.logger.get("price")) +
            this.logger.getCurrentSide() * profitAmount;

        const stopLossAmount = parseFloat(
            this.logger.get("price") * this.getConfig("stopLoss")
        );
        const stopLossPrice =
            parseFloat(this.logger.get("price")) -
            this.logger.getCurrentSide() * stopLossAmount;

        let response =
            this.getCurrentSide() === this.logger.SELL
                ? currentPrice <= profitPrice || currentPrice >= stopLossPrice
                : currentPrice >= profitPrice || currentPrice <= stopLossPrice;

        this.logger.write(
            `We will tp at ${profitPrice} and sl at ${stopLossPrice}`,
            "info"
        );

        this.logger.write(
            `${response ? "Sounds OK to close position" : "Nothing to do"}`,
            "POSITION"
        );

        return response;
    }
}

module.exports = ScalpingStrategy;
