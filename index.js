const Client = require("./src/Client");
const BinanceWrapper = require("./src/Exchanges/BinanceWrapper");
const Scalping = require("./src/Strategies/Scalping");
const Engulfing = require("./src/Strategies/Engulfing");
const ScalpingEmaMacd = require("./src/Strategies/ScalpingEmaMacd");
const Logger = require("./src/Support/Logger");

require("dotenv").config();

// const apiKey = process.env.API_KEY;
// const apiSecret = process.env.API_SECRET;
const apiKey =
    "CxoFtnKSXyhCSmVsfg8XrBAIWDCGrfsLOONZjONfkLd2ynwmeRL67OYKYPexC19R";
const apiSecret =
    "tx2WF7gAOPVTy7wmAFqSnumqTsmyA4jMGQLOXICCbXDNkVqdWyUknodYiEZ8H4jJ";

new Client()
    .setLogger(new Logger())
    .setExchangeClient(new BinanceWrapper(apiKey, apiSecret))
    .setStrategy(new Engulfing())
    .run();
