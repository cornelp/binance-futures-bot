module.exports = {
    symbol: "ETHUSDT,ADAUSDT,EGLDUSDT,NKNUSDT",
    interval: "5m",
    candleCount: 20,
    amount: 20,
    leverage: 3,
    takeProfit: 0.5 / 100, // zero for no takeProfitTrigger
    stopLoss: 0.4 / 100, // zero for no stopLossTrigger
};
