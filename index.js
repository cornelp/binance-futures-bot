const Client = require("./src/Client");
const BinanceWrapper = require('./src/Exchanges/BinanceWrapper');
const ScalpingStrategy = require("./src/Strategies/ScalpingStrategy");
const HullMovingAgerageStrategy = require("./src/Strategies/HullMovingAverageStrategy");

(new Client)
    .setExchangeClient(new BinanceWrapper)
    .setStrategies([
        new ScalpingStrategy()
    ])
    .run();
