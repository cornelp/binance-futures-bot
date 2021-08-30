const dayjs = require("dayjs");
const fs = require("fs");

class Logger {
    constructor() {
        this.logPath = __dirname + "/../../log/action.log";
    }

    write(data) {
        data = "[" + dayjs().format("DD.MM.YYYY HH:mm:ss") + "] " + data + "\n";

        fs.appendFile(this.logPath, data, (err, data) => {
            if (err) throw err;
        });
    }
}

module.exports = Logger;
