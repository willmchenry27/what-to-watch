import puppeteer from 'puppeteer'

const browser = await puppeteer.launch({ headless: true })
const page = await browser.newPage()

await page.setViewport({ width: 1440, height: 900 })
await page.goto('http://localhost:5174', { waitUntil: 'networkidle0', timeout: 15000 })
await new Promise(r => setTimeout(r, 2000))
await page.screenshot({ path: '/tmp/wtw-desktop.png', fullPage: true })
console.log('Desktop screenshot saved')

await browser.close()
