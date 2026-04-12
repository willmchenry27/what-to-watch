const express = require('express')
const cors = require('cors')
const guideRoutes = require('./routes/guide')
const actionsRoutes = require('./routes/actions')
const { startScheduler } = require('./services/scheduler')

const app = express()

app.use(cors({
  origin: [
    'http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175',
    process.env.APP_URL,
  ].filter(Boolean),
}))
app.use(express.json())

app.use('/api/guide', guideRoutes)
app.use('/api/actions', actionsRoutes)

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.get('/api', (req, res) => {
  res.json({
    name: 'What to Watch API',
    health: '/api/health',
    endpoints: ['/api/guide', '/api/actions'],
  })
})

app.get('/', (req, res) => {
  const frontendUrl = process.env.APP_URL || 'http://localhost:5173'
  res.type('html').send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>What to Watch API</title>
  <style>
    body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #0a0a0c; color: #f5f0e8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .card { max-width: 420px; padding: 40px 32px; text-align: center; }
    h1 { margin: 0 0 8px; font-size: 24px; font-weight: 800; letter-spacing: -0.3px; }
    p { margin: 0 0 24px; font-size: 14px; color: #888; }
    a.button { display: inline-block; padding: 12px 24px; background: #c9a84c; color: #0a0a0c; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 700; }
    a.button:hover { background: #d4b35c; }
    .health { margin-top: 24px; font-size: 12px; color: #555; }
    .health a { color: #888; text-decoration: none; }
    .health a:hover { color: #c9a84c; }
  </style>
</head>
<body>
  <div class="card">
    <h1>What to Watch API is running.</h1>
    <p>This is the backend. The website lives at the link below.</p>
    <a class="button" href="${frontendUrl}">Open the website</a>
    <div class="health">API health: <a href="/api/health">/api/health</a></div>
  </div>
</body>
</html>`)
})

app.listen(process.env.PORT || 3001, '0.0.0.0', () => {
  console.log(`Server running on port ${process.env.PORT || 3001}`)
  if (process.env.ENABLE_INTERNAL_SCHEDULER === 'true') {
    startScheduler()
  } else {
    console.log('In-process scheduler disabled. Set ENABLE_INTERNAL_SCHEDULER=true to enable.')
  }
})
