module.exports = {
    symbol: "ETHUSDT,EGLDUSDT,BTCUSDT",
    interval: "5m",
    candleCount: 20,
    amount: 500,
    leverage: 3,
    takeProfit: 0.5 / 100, // zero for no takeProfitTrigger
    stopLoss: 0.4 / 100, // zero for no stopLossTrigger
};
