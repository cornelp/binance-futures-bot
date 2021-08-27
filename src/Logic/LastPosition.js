const fs = require("fs");

class LastPosition {
    constructor() {
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

    currentOperation() {
        //
    }
}

module.exports = LastPosition;
