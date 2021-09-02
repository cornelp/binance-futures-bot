const AbstractStrategy = require("./AbstractStrategy.js");
const indicators = require("./../Indicators.js");

class MomentumStrategy extends AbstractStrategy {
    constructor(client) {
        super(client);
    }

    run() {}

    isSignalShort() {}

    isSignalLong() {}
}

export default MomentumStrategy;
