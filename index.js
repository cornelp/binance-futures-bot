const Client = require("./src/Client");
const BinanceWrapper = require("./src/Exchanges/BinanceWrapper");
const ScalpingStrategy = require("./src/Strategies/ScalpingStrategy");
const EngulfingStrategy = require("./src/Strategies/EngulfingStrategy");
const Logger = require("./src/Support/Logger");

require("dotenv").config();

const apiKey = process.env.API_KEY;
const apiSecret = process.env.API_SECRET;

const customScalpingConfig = {
    takeProfit: 0.6 / 100,
    stopLoss: 0.3 / 100,
};

new Client()
    .setLogger(new Logger())
    .setExchangeClient(new BinanceWrapper(apiKey, apiSecret))
    .setStrategies([
        new ScalpingStrategy(),
        new EngulfingStrategy(),
        new ScalpingStrategy(customScalpingConfig),
    ])
    .run();
