module.exports = {
    symbol: "ETHUSDT",

    interval: "1m",

    // no of previous prices to store
    // needed for calculating average price, etc
    previousPricesNo: 1 * 30 * 60, // 1 every 2 seconds * 30 per second * 60 minutes (whole hour)

    // used for checking if the price trend is up/down
    marginTrigger: 0.5, // percent

    // no of prices to be taked into consideration
    // when deciding the current trend
    pricesNoForTrendCalculation: 5,

    // used for determining SELL position
    takeProfit: 5, // percent

    // used for closing position
    // in order to prevent further loss
    stopLoss: 90, // percent

    // RSI indicators
    overBought: 70,
    overSold: 30,
};
