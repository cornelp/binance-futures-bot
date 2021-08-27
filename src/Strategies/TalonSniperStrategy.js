const AbstractStrategy = require("./AbstractStrategy");
const indicators = require("./../Indicators");

class TalonSniperStrategy extends AbstractStrategy {
    constructor(client, lastPosition) {
        super(client, lastPosition);

        // don't really know what this stands for
        this.factor = 1;
    }

    isPriceRightForBuy() {}

    isPriceRightForSell() {}

    run() {
        this.ha = indicators.heikinAshi(this.candleData);

        const h12 = this.getMultiScaleSignal();

        this.setIsBusy(false);

        this.isPriceRightForBuy();
    }

    getMultiScaleSignal() {
        const averageTrueRange = this.getAverageTrueRange();

        const upsAndDowns = averageTrueRange.reduce(
            (acc, item, index) => {
                const currentHa = this.ha[index + 1];

                const h12 = (currentHa.high + currentHa.low) / 2;

                acc.up.push(h12 - this.factor * item);
                acc.down.push(h12 + this.factor * item);

                return acc;
            },
            { up: [], down: [] }
        );

        const trendUpsAndDowns = averageTrueRange.reduce(
            (acc, item, index) => {
                if (index === 0) return acc;

                if (this.ha[index - 1].close > acc.trendUp[index - 1]) {
                    acc.trendUp.push(
                        Math.max(upsAndDowns.up[index], acc.trendUp[index - 1])
                    );
                } else {
                    acc.trendUp.push(upsAndDowns.up[index]);
                }

                if (this.ha[index - 1].close < acc.trendDown[index - 1]) {
                    acc.trendDown.push(
                        Math.min(
                            upsAndDowns.down[index],
                            acc.trendDown[index - 1]
                        )
                    );
                } else {
                    acc.trendDown.push(upsAndDowns.down[index]);
                }

                return acc;
            },
            { trendUp: [], trendDown: [] }
        );
    }

    getAverageTrueRange() {
        const result = this.ha.map((item, index, arr) => {
            if (index === 0) return null;

            return Math.max(
                item.high - item.low,
                Math.abs(item.high - arr[index - 1].close),
                Math.abs(item.low - arr[index - 1].close)
            );
        });

        result.shift();

        return result;
    }

    calculateMultiScaleSignal() {}
}

module.exports = TalonSniperStrategy;
