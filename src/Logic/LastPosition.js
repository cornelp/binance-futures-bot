const fs = require("fs");

class LastPosition {
    constructor() {
        this.BUY = 1;
        this.SELL = -1;

        this.lastPositionLog = __dirname + "/../../log/last-position.json";

        this.loadConfiguration();
    }

    loadConfiguration() {
        this.config = JSON.parse(
            fs.readFileSync(this.lastPositionLog, "utf-8")
        );
    }

    write(data) {
        this.config = data;

        fs.writeFileSync(
            this.lastPositionLog,
            JSON.stringify(this.config, null, 2),
            "utf-8"
        );
    }

    get(value = null) {
        return value ? this.config[value] : this.config;
    }

    getCurrentSide() {
        return this.get("type") === this.SELL ? this.SELL : this.BUY;
    }
}

module.exports = LastPosition;
