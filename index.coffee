sync = require("./lib/sync")

repo = process.argv[process.argv.length - 1]
sync(process.cwd(), repo)
