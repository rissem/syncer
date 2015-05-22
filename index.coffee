sync = require("./lib/sync")

console.log("SYNC", sync)

sync(process.cwd(), process.argv[process.argv.length - 1])
