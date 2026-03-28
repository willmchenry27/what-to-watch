const express = require('express')
const cors = require('cors')
const guideRoutes = require('./routes/guide')
const { startScheduler } = require('./services/scheduler')

const PORT = process.env.PORT || 3001

const app = express()

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'],
}))
app.use(express.json())

app.use('/api/guide', guideRoutes)

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
  startScheduler()
})
