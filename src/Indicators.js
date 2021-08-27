module.exports = {
    heikinAshi: (candleData) => {
        ha = Object.values(candleData)
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

        // remove first and last candle info data,
        // first does - not have prior data needed for HA calculations
        ha.shift();

        // remove last info data
        // ha.pop();

        return ha;
    },

    rsi(candleData, candleCount) {
        const rs = Object.keys(candleData).reduce(
            (acc, key) => {
                if (candleData[key].open > candleData[key].close) {
                    acc.loss++;
                }

                if (candleData[key].open < candleData[key].close) {
                    acc.gain++;
                }

                return acc;
            },
            { gain: 0, loss: 0 }
        );

        return (
            100 - 100 / (1 + rs.gain / candleCount / (rs.loss / candleCount))
        );
    },

    // remove, is it useless ??
    appendTrendInfo() {
        const trend = this.ha.map((item) => {
            // determine if green or red
            // does it have wicks
            const shadow = item.high - item.low;
            const isRed = item.close < item.open;

            const body = Math.abs(item.close - item.open);

            const upperWick = Math.floor(
                item.high - (isRed ? item.close : item.open)
            );
            const lowerWick = Math.floor(
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

            // console.log(item);

            return item;
        });
    },
};
