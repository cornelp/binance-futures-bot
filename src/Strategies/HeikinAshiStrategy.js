const AbstractStrategy = require("./AbstractStrategy");

class HeikinAshiStrategy extends AbstractStrategy {
    isPriceRightForBuy() {
        // let lastCandle = this.ha[this.ha.length - 1];
        // let penultimCandle = this.ha[this.ha.length - 2];
        //
        // return (
        //     lastCandle.close > lastCandle.open &&
        //     lastCandle.open > penultimCandle.close
        // );
    }

    isPriceRightForSell() {
        // let lastCandle = this.ha[this.ha.length - 1];
        //
        // return lastCandle.close < lastCandle.open;
    }

    calculate() {
        this.ha = Object.values(this.candleData)
            // fix index from timestamp to [0,1,2]
            .map((item) => ({
                high: parseFloat(item.high),
                low: parseFloat(item.low),
                open: parseFloat(item.open),
                close: parseFloat(item.close),
            }))
            .map((data, index, arr) => {
                const previousData = index > 0 ? arr[index - 1] : data;

                const close =
                    (data.open + data.high + data.low + data.close) / 4;

                const open = (previousData.open + previousData.close) / 2;

                const response = {
                    close,
                    open,
                    high: Math.max(data.high, close, open),
                    low: Math.min(data.low, close, open),
                };

                return response;
            });

        this.determineTrend();
    }

    determineTrend() {
        this.appendTrendInfo();

        let trend = { isRed: null, count: 0, dojosCount: 0, scoring: 0 };

        this.ha.forEach((item) => {
            if (trend.isRed !== item.trend.isRed) {
                trend.isRed = item.trend.isRed;

                if (!item.trend.dojosCount) {
                    trend.scoring = this.getScore(item);
                } else {
                    trend.scoring += this.getScore(item);
                }
            } else {
                trend.scoring = trend.scoring + this.getScore(item);
            }

            if (item.trend.isDojo) {
                trend.dojosCount++;
                trend.count = 0;
            } else {
                trend.count++;
            }

            console.log(item.trend);
        });

        // then check if that sequence is still rolling
        // or the trend has been reversed/reversing
        //
        //
    }

    getScore(item) {
        const scores = {
            hammerClear: 3,
            hammerWicked: 2,
            wicked: 1,
            dojo: -2,
        };

        if (item.trend.isDojo) {
            return scores.dojo;
        }

        if (item.trend.wicks.upper.value && item.trend.wicks.lower.value) {
            return scores.wicked;
        }

        if (item.trend.isHammer) {
            return item.trend.wicks.upper.value || item.trend.wicks.lower.value
                ? scores.hammerWicked
                : scores.hammerClear;
        }
    }

    appendTrendInfo() {
        const trend = this.ha.map((item) => {
            // determine if green or red
            // does it have wicks
            const shadow = item.high - item.low;
            const isRed = item.close < item.open;

            const body = this.getBodyChart(item.close, item.open);

            const upperWick = parseInt(
                item.high - (isRed ? item.close : item.open)
            );
            const lowerWick = parseInt(
                (isRed ? item.close : item.open) - item.low
            );

            const fatUpperWick = upperWick > 0 && upperWick / shadow > 0.33;
            const fatLowerWick = lowerWick > 0 && lowerWick / shadow > 0.33;

            item.trend = {
                isRed,
                wicks: {
                    upper: {
                        value: upperWick > 0,
                        isFat: fatUpperWick,
                    },
                    lower: {
                        value: lowerWick > 0,
                        isFat: fatLowerWick,
                    },
                },
                isDojo: fatLowerWick && fatUpperWick,
                isHammer: !upperWick || !lowerWick,
            };

            return item;
        });
    }

    getBodyChart(close, open) {
        let body = close - open;

        // convert if necessary
        if (body < 0) body *= -1;

        return body;
    }
}

module.exports = HeikinAshiStrategy;
