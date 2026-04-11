require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })

const { runPipeline } = require('../services/scheduler')

const VALID_MODES = ['email', 'refresh-only']
const mode = process.env.PIPELINE_MODE || 'email'
if (!VALID_MODES.includes(mode)) {
  console.error(`Invalid PIPELINE_MODE: ${mode}. Must be one of: ${VALID_MODES.join(', ')}`)
  process.exit(1)
}

runPipeline({ sendEmail: mode === 'email' })
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Pipeline failed:', err)
    process.exit(1)
  })
