require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })

const { Resend } = require('resend')
const { signRecipientToken, normalizeEmail } = require('../lib/recipientToken')

function parseRecipients(raw) {
  if (!raw) return []
  const seen = new Set()
  const list = []
  for (const part of String(raw).split(',')) {
    const email = normalizeEmail(part)
    if (email && email.includes('@') && !seen.has(email)) {
      seen.add(email)
      list.push(email)
    }
  }
  return list
}

function validateEmailEnv() {
  const missing = []
  if (!process.env.APP_URL) missing.push('APP_URL')
  if (!process.env.API_PUBLIC_URL) missing.push('API_PUBLIC_URL')
  if (!process.env.ACTION_LINK_SECRET) missing.push('ACTION_LINK_SECRET')
  if (!process.env.NOTIFICATION_EMAIL) missing.push('NOTIFICATION_EMAIL')
  if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 'YOUR_RESEND_API_KEY_HERE') {
    missing.push('RESEND_API_KEY')
  }
  if (missing.length > 0) {
    throw new Error(`Missing or invalid required env vars: ${missing.join(', ')}`)
  }
}

function scoreColor(value) {
  if (value >= 80) return '#34d399'
  if (value >= 60) return '#fbbf24'
  return '#f87171'
}

function tmdbUrl(pick) {
  if (!pick.tmdb_id) return null
  const mediaType = pick.type === 'tv' ? 'tv' : 'movie'
  return `https://www.themoviedb.org/${mediaType}/${pick.tmdb_id}`
}

function actionLinks(pick, token) {
  const apiBase = process.env.API_PUBLIC_URL || process.env.APP_URL || 'http://localhost:3001'
  const t = encodeURIComponent(token)
  const linkStyle = 'color:#555;font-size:10px;text-decoration:none;'
  return `<div style="margin-top:6px;"><a href="${apiBase}/api/actions/seen/${pick.tmdb_id}?r=${t}" style="${linkStyle}">Seen it</a> &nbsp;&middot;&nbsp; <a href="${apiBase}/api/actions/dismiss/${pick.tmdb_id}?r=${t}" style="${linkStyle}">Not for me</a></div>`
}

function buildPickRow(pick, rank, showScore, token) {
  const scoreHtml = showScore && pick.combined_score != null
    ? `<span style="color:${scoreColor(pick.combined_score)};font-weight:800;font-size:20px;">${pick.combined_score}</span>`
    : '<span style="color:#444;font-size:14px;">—</span>'
  const imdb = showScore && pick.imdb_score != null ? `IMDb <span style="color:${scoreColor(pick.imdb_score * 10)};font-weight:600;">${pick.imdb_score}</span>` : ''
  const rt = showScore && pick.rt_score != null ? `RT <span style="color:${scoreColor(pick.rt_score)};font-weight:600;">${pick.rt_score}%</span>` : ''
  const tmdb = showScore && !imdb && !rt && pick.tmdb_vote_average != null ? `TMDB <span style="color:${scoreColor(pick.tmdb_vote_average * 10)};font-weight:600;">${Math.round(pick.tmdb_vote_average * 10) / 10}</span>` : ''
  const scores = [imdb, rt, tmdb].filter(Boolean).join(' &nbsp;&middot;&nbsp; ')
  const platform = pick.platform ? `<span style="display:inline-block;background:rgba(255,255,255,0.08);color:#ccc;font-size:10px;font-weight:600;padding:2px 8px;border-radius:4px;text-transform:uppercase;letter-spacing:0.5px;">${pick.platform}</span>` : ''

  return `
    <tr>
      <td style="padding:14px 0;border-bottom:1px solid rgba(255,255,255,0.06);">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
          <tr>
            <td width="40" style="vertical-align:top;padding-right:12px;">
              <span style="display:inline-block;width:32px;height:32px;line-height:32px;text-align:center;border-radius:50%;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);color:#c9a84c;font-weight:700;font-size:13px;">#${rank}</span>
            </td>
            <td style="vertical-align:top;">
              <div style="font-size:16px;font-weight:700;color:#f5f0e8;margin-bottom:4px;">${tmdbUrl(pick) ? `<a href="${tmdbUrl(pick)}" style="color:#f5f0e8;text-decoration:none;">${pick.title}</a>` : pick.title}</div>
              <div style="font-size:12px;color:#888;margin-bottom:${scores ? '6' : '0'}px;">${(pick.genres || []).slice(0, 3).join(', ')} ${platform ? '&nbsp;&middot;&nbsp;' + platform : ''}</div>
              ${scores ? `<div style="font-size:12px;color:#999;">${scores}</div>` : ''}
              ${showScore ? actionLinks(pick, token) : ''}
            </td>
            ${showScore ? `<td width="60" style="vertical-align:middle;text-align:right;">${scoreHtml}</td>` : ''}
          </tr>
        </table>
      </td>
    </tr>`
}

function buildEmailHtml(guide, allPicks, token) {
  const fresh = allPicks.filter((p) => p.cohort === 'fresh')
  const simmered = allPicks.filter((p) => p.cohort === 'simmered')

  const freshHeroIdx = fresh.findIndex((p) => p.backdrop_path || p.poster_path)
  const freshHero = freshHeroIdx >= 0 ? fresh[freshHeroIdx] : fresh[0]
  const freshRunners = fresh.filter((_, i) => i !== freshHeroIdx).slice(0, 5)

  // Top Rated: up to 10 total scored picks INCLUDING the hero. Slice first,
  // then pick hero from the limited list so runners + hero === simmeredTop.length.
  const simmeredTop = simmered
    .filter((p) => p.combined_score != null)
    .sort((a, b) => b.combined_score - a.combined_score)
    .slice(0, 10)
  const simmeredHeroIdx = simmeredTop.findIndex((p) => p.backdrop_path || p.poster_path)
  const simmeredHero = simmeredHeroIdx >= 0 ? simmeredTop[simmeredHeroIdx] : (simmeredTop[0] || null)
  const simmeredRunners = simmeredTop.filter((p) => p !== simmeredHero)

  // Fresh hero
  const freshHeroImage = freshHero ? (freshHero.backdrop_path || freshHero.poster_path || '') : ''
  const freshHeroBlock = freshHero ? `
    <tr>
      <td style="padding:0 0 24px;">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#111114;border-radius:12px;overflow:hidden;border:1px solid rgba(255,255,255,0.06);">
          ${freshHeroImage ? `<tr><td><img src="${freshHeroImage}" alt="${freshHero.title}" width="600" style="display:block;width:100%;height:auto;max-height:240px;object-fit:cover;" /></td></tr>` : ''}
          <tr>
            <td style="padding:20px 24px;">
              <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#c9a84c;text-transform:uppercase;letter-spacing:2px;">#1 Most Anticipated</p>
              <h2 style="margin:0 0 6px;font-size:24px;font-weight:800;color:#f5f0e8;">${tmdbUrl(freshHero) ? `<a href="${tmdbUrl(freshHero)}" style="color:#f5f0e8;text-decoration:none;">${freshHero.title}</a>` : freshHero.title}</h2>
              <p style="margin:0 0 10px;font-size:13px;color:#888;">${(freshHero.genres || []).join(', ')}${freshHero.platform ? ' &middot; ' + freshHero.platform : ''}</p>
              ${freshHero.description ? `<p style="margin:0;font-size:13px;line-height:1.5;color:#aaa;">${freshHero.description.slice(0, 200)}${freshHero.description.length > 200 ? '...' : ''}</p>` : ''}
            </td>
          </tr>
        </table>
      </td>
    </tr>` : ''

  const freshRows = freshRunners.map((p, i) => buildPickRow(p, i + 2, false, token)).join('')

  // Simmered hero
  const simHeroImage = simmeredHero ? (simmeredHero.backdrop_path || simmeredHero.poster_path || '') : ''
  const simScoreHtml = simmeredHero && simmeredHero.combined_score != null
    ? `<span style="display:inline-block;background:${scoreColor(simmeredHero.combined_score)};color:#0a0a0c;font-weight:800;font-size:18px;padding:4px 12px;border-radius:6px;margin-right:8px;">${simmeredHero.combined_score}</span>`
    : ''
  const simImdb = simmeredHero && simmeredHero.imdb_score != null ? `<span style="color:#a0a0a0;font-size:13px;margin-right:12px;">IMDb <span style="color:${scoreColor(simmeredHero.imdb_score * 10)};font-weight:700;">${simmeredHero.imdb_score}</span></span>` : ''
  const simRt = simmeredHero && simmeredHero.rt_score != null ? `<span style="color:#a0a0a0;font-size:13px;">RT <span style="color:${scoreColor(simmeredHero.rt_score)};font-weight:700;">${simmeredHero.rt_score}%</span></span>` : ''
  const simTmdb = simmeredHero && !simImdb && !simRt && simmeredHero.tmdb_vote_average != null ? `<span style="color:#a0a0a0;font-size:13px;">TMDB <span style="color:${scoreColor(simmeredHero.tmdb_vote_average * 10)};font-weight:700;">${Math.round(simmeredHero.tmdb_vote_average * 10) / 10}</span></span>` : ''

  const simHeroBlock = simmeredHero ? `
    <tr>
      <td style="padding:0 0 24px;">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#111114;border-radius:12px;overflow:hidden;border:1px solid rgba(255,255,255,0.06);">
          ${simHeroImage ? `<tr><td><img src="${simHeroImage}" alt="${simmeredHero.title}" width="600" style="display:block;width:100%;height:auto;max-height:240px;object-fit:cover;" /></td></tr>` : ''}
          <tr>
            <td style="padding:20px 24px;">
              <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#c9a84c;text-transform:uppercase;letter-spacing:2px;">#1 Top Rated</p>
              <h2 style="margin:0 0 6px;font-size:24px;font-weight:800;color:#f5f0e8;">${tmdbUrl(simmeredHero) ? `<a href="${tmdbUrl(simmeredHero)}" style="color:#f5f0e8;text-decoration:none;">${simmeredHero.title}</a>` : simmeredHero.title}</h2>
              <p style="margin:0 0 10px;font-size:13px;color:#888;">${(simmeredHero.genres || []).join(', ')}${simmeredHero.platform ? ' &middot; ' + simmeredHero.platform : ''}</p>
              <div style="margin:0 0 12px;">${simScoreHtml}${simImdb}${simRt}${simTmdb}</div>
              ${simmeredHero.description ? `<p style="margin:0 0 10px;font-size:13px;line-height:1.5;color:#aaa;">${simmeredHero.description.slice(0, 200)}${simmeredHero.description.length > 200 ? '...' : ''}</p>` : ''}
              ${actionLinks(simmeredHero, token)}
            </td>
          </tr>
        </table>
      </td>
    </tr>` : ''

  const simRows = simmeredRunners.map((p, i) => buildPickRow(p, i + 2, true, token)).join('')

  // Open app CTA (bootstraps web session with token)
  const appUrl = process.env.APP_URL || 'http://localhost:3001'
  const openAppHref = `${appUrl}/?r=${encodeURIComponent(token)}`

  // Simmered section (only if we have scored content)
  const simmeredSection = simmeredTop.length > 0 ? `
    <!-- Last Week's Top Rated Header -->
    <tr>
      <td style="padding:0 0 16px;">
        <h3 style="margin:0 0 4px;font-size:14px;font-weight:700;color:#c9a84c;text-transform:uppercase;letter-spacing:1px;">Top Rated</h3>
        <p style="margin:0;font-size:12px;color:#555;">Scores settled — ranked by IMDb + community ratings</p>
      </td>
    </tr>

    ${simHeroBlock}

    ${simRows ? `<tr><td><table width="100%" cellpadding="0" cellspacing="0" role="presentation">${simRows}</table></td></tr>` : ''}
  ` : ''

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>What to Watch This Friday</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0c;color:#f5f0e8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#0a0a0c;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="padding:0 0 24px 0;text-align:center;">
              <h1 style="margin:0;font-size:28px;font-weight:800;color:#f5f0e8;letter-spacing:-0.5px;">What to Watch</h1>
              <p style="margin:6px 0 0;font-size:16px;font-style:italic;color:#c9a84c;">This Friday</p>
              <p style="margin:8px 0 0;font-size:12px;color:#666;text-transform:uppercase;letter-spacing:2px;">Week of ${guide.week_of}</p>
            </td>
          </tr>

          ${simmeredSection}

          <!-- Fresh Drops Header -->
          <tr>
            <td style="padding:0 0 16px;">
              <h3 style="margin:0 0 4px;font-size:14px;font-weight:700;color:#f5f0e8;text-transform:uppercase;letter-spacing:1px;">Fresh Drops</h3>
              <p style="margin:0;font-size:12px;color:#555;">New this week — sorted by buzz</p>
            </td>
          </tr>

          ${freshHeroBlock}

          ${freshRows ? `<tr><td><table width="100%" cellpadding="0" cellspacing="0" role="presentation">${freshRows}</table></td></tr>` : ''}

          <!-- Open app CTA -->
          <tr>
            <td style="padding:24px 0 0;text-align:center;">
              <a href="${openAppHref}" style="display:inline-block;padding:10px 20px;background:#c9a84c;color:#0a0a0c;border-radius:6px;text-decoration:none;font-size:13px;font-weight:700;">Open What to Watch</a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:32px 0 0;text-align:center;">
              <div style="height:1px;background:rgba(255,255,255,0.06);margin-bottom:24px;"></div>
              <p style="margin:0;font-size:13px;font-weight:600;color:#888;">What to Watch</p>
              <p style="margin:4px 0 0;font-size:11px;color:#555;">Ranked by critics, updated every Friday.</p>
              <p style="margin:4px 0 0;font-size:10px;color:#444;">Powered by IMDb + TMDB</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

async function sendWeeklyEmailToRecipient(guide, allPicks, recipientEmail) {
  validateEmailEnv()
  const recipient = normalizeEmail(recipientEmail)
  if (!recipient || !recipient.includes('@')) {
    throw new Error(`Invalid recipient email: ${recipientEmail}`)
  }

  const token = signRecipientToken(recipient)
  const html = buildEmailHtml(guide, allPicks, token)
  const fresh = allPicks.filter((p) => p.cohort === 'fresh')
  const heroTitle = fresh[0]?.title || allPicks[0]?.title || 'This Week'

  const resend = new Resend(process.env.RESEND_API_KEY)
  const { data, error } = await resend.emails.send({
    from: 'onboarding@resend.dev',
    to: recipient,
    subject: `What to Watch This Friday — ${heroTitle}`,
    html,
  })

  if (error) throw new Error(`Resend error: ${JSON.stringify(error)}`)

  console.log(`Email sent to ${recipient} (id: ${data.id})`)
  return data
}

module.exports = { sendWeeklyEmailToRecipient, buildEmailHtml, parseRecipients, validateEmailEnv }
