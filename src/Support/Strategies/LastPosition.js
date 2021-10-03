const fs = require("fs");
const path = require("path");
const dayjs = require("dayjs");

class LastPosition {
  constructor(logName) {
    this.transactionsLog = path.join(
      __dirname,
      `/../../../log/${logName.toLowerCase()}`
    );

    this.checkIfExists(this.transactionsLog, true, "");

    this.transactionsLog += "/transactions.log";

    this.checkIfExists(this.transactionsLog, false, "");
  }

  checkIfExists(path, isDir = false, defaultValue = "") {
    if (!fs.existsSync(path)) {
      isDir
        ? fs.mkdirSync(path, { recursive: true })
        : fs.writeFileSync(path, defaultValue);
    }
  }

  write(values) {
    const message = `${values.status};${values.coin};${values.price};${values.quantity};${values.type}`;

    // also adding to transactions.log
    fs.appendFile(
      this.transactionsLog,
      this.wrapToTimestamp(message),
      (err, data) => {
        if (err) throw err;
      }
    );
  }

  wrapToTimestamp(data, title) {
    return (
      "[" +
      dayjs().format("DD.MM.YYYY HH:mm:ss") +
      "] " +
      (title ? `[${title.toUpperCase()}] ` : "") +
      data +
      "\n"
    );
  }
}

module.exports = LastPosition;
