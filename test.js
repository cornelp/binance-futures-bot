const Binance = require("./src/Exchanges/Binance");
const Strategy = require("./src/Strategies/Engulfing");

const apiKey =
    "CxoFtnKSXyhCSmVsfg8XrBAIWDCGrfsLOONZjONfkLd2ynwmeRL67OYKYPexC19R";
const apiSecret =
    "tx2WF7gAOPVTy7wmAFqSnumqTsmyA4jMGQLOXICCbXDNkVqdWyUknodYiEZ8H4jJ";

const strategy = new Strategy();
const binance = new Binance(apiKey, apiSecret);

binance.summary(["ETHUSDT"], "1m", 2);

binance.subscribeToPosition(async (evt) => {
    const coin = evt.symbol;

    console.log("position is now opened");

    // if the position is opened now, add TP/SL
    const stopLossPrice = strategy.getStopLossPrice(
        3150.0,
        evt.side === "BUY" ? -1 : 1
    );

    await binance.addStopLoss(stopLossPrice, evt);

    const profitPrice = strategy.getTakeProfitPrice(
        3200.08,
        evt.side === "BUY" ? 1 : -1
    );

    await binance.addTakeProfit(profitPrice, evt);
});

setTimeout(() => {
    binance.setManualCurrentPrice("ETHUSDT", 3212.7);
    binance.openLong("ETHUSDT", 20);
}, 3000);
