const Binance = require("binance-api-node").default;
const Client = require("./src/Client");
const ScalpingStrategy = require("./src/Strategies/ScalpingStrategy");
const HullMovingAgerageStrategy = require("./src/Strategies/HullMovingAverageStrategy");

const binance = Binance({
    apiKey: process.env.API_KEY,
    apiSecret: process.env.API_SECRET,
});

client = new Client(binance);

client
    .setGlobalConfiguration({
        symbol: "ETHUSDT,ADAUSDT,NKNUSDT",
        interval: "5m",
        candleCount: 200,
    })
    .setStrategies([new ScalpingStrategy(), new HullMovingAgerageStrategy()])
    .run();
