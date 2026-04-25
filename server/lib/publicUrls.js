function normalizePublicUrl(value) {
  return String(value || '').trim().replace(/\/+$/, '')
}

function requireAbsoluteUrl(name, value) {
  const url = normalizePublicUrl(value)
  if (!url) {
    throw new Error(`${name} is required`)
  }

  let parsed
  try {
    parsed = new URL(url)
  } catch {
    throw new Error(`${name} must be an absolute URL`)
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error(`${name} must use http or https`)
  }

  return url
}

function getApiPublicUrl() {
  return requireAbsoluteUrl('API_PUBLIC_URL', process.env.API_PUBLIC_URL)
}

function getAppUrl() {
  return requireAbsoluteUrl('APP_URL', process.env.APP_URL)
}

function getEmailPublicUrls() {
  const appUrl = getAppUrl()
  const apiPublicUrl = getApiPublicUrl()

  if (appUrl === apiPublicUrl) {
    throw new Error(
      'APP_URL must point to the frontend website, but it matches API_PUBLIC_URL. ' +
      'Set APP_URL to the Vercel app URL and API_PUBLIC_URL to the backend URL.'
    )
  }

  return { appUrl, apiPublicUrl }
}

function appUrlWithRecipientToken(appUrl, token) {
  const url = new URL(appUrl)
  url.searchParams.set('r', token)
  return url.toString()
}

module.exports = {
  appUrlWithRecipientToken,
  getApiPublicUrl,
  getAppUrl,
  getEmailPublicUrls,
  normalizePublicUrl,
}
