module.exports = {
    symbol: "BTCBUSD",
    interval: "1m",
    candleCount: 250,

    stochasticBuyLevel: 20,
    stochasticSellLevel: 80,
    pricePercentNearEma: 3,

    amount: 200,
    leverage: 3,

    takeProfit: 1.006, // zero for no takeProfitTrigger
    stopLoss: 1.003, // zero for no stopLossTrigger
};
