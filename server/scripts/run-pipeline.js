require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })

const { runPipeline } = require('../services/scheduler')

runPipeline()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Pipeline failed:', err)
    process.exit(1)
  })
