'use strict'
const axios = require('axios')
const cheerio = require('cheerio')

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

function cleanText(x) {
  return String(x || '').replace(/\s+/g, ' ').trim()
}

function toInt(x) {
  const n = Number(String(x || '').replace(/[^\d]/g, ''))
  return Number.isFinite(n) ? n : null
}

function normalizeUrl(u) {
  const s = cleanText(u)
  if (!s) return null
  if (/^https?:\/\//i.test(s)) return s
  if (s.startsWith('//')) return 'https:' + s
  if (s.startsWith('/')) return 'https://www.youtube.com' + s
  return s
}

function parseDurationSeconds(timestamp) {
  const t = cleanText(timestamp)
  if (!t) return null
  const parts = t.split(':').map((p) => Number(p))
  if (!parts.length || parts.some((n) => !Number.isFinite(n))) return null
  let sec = 0
  for (const n of parts) sec = sec * 60 + n
  return sec
}

function pickBestThumbnail(thumbnails) {
  if (!Array.isArray(thumbnails) || !thumbnails.length) return null
  const t = thumbnails[thumbnails.length - 1]
  return normalizeUrl(t?.url) || null
}

function safeArray(x) {
  return Array.isArray(x) ? x : []
}
function extractJsonObject(html, marker) {
  const idx = html.indexOf(marker)
  if (idx === -1) return null

  const start = html.indexOf('{', idx)
  if (start === -1) return null

  let i = start
  let depth = 0
  let inStr = false
  let strCh = ''
  let esc = false

  for (; i < html.length; i++) {
    const ch = html[i]

    if (inStr) {
      if (esc) {
        esc = false
      } else if (ch === '\\') {
        esc = true
      } else if (ch === strCh) {
        inStr = false
        strCh = ''
      }
      continue
    }

    if (ch === '"' || ch === "'") {
      inStr = true
      strCh = ch
      continue
    }

    if (ch === '{') depth++
    if (ch === '}') depth--

    if (depth === 0) {
      const raw = html.slice(start, i + 1)
      try {
        return JSON.parse(raw)
      } catch (e) {
       
        try {
          const jsonish = raw
            .replace(/\\x([0-9a-fA-F]{2})/g, (_, h) =>
              String.fromCharCode(parseInt(h, 16))
            )
          return JSON.parse(jsonish)
        } catch (_) {
          return null
        }
      }
    }
  }

  return null
}

async function httpGet(url, timeout) {
  const res = await axios.get(url, {
    timeout: timeout || 45000,
    maxRedirects: 5,
    responseType: 'text',
    headers: {
      'User-Agent': UA,
      'Accept-Language': 'en-US,en;q=0.9',
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
   
      Cookie: 'CONSENT=YES+1; GPS=1;'
    },
    validateStatus: () => true
  })

  if (res.status < 200 || res.status >= 400) {
    throw new Error(`YouTube HTTP ${res.status}`)
  }
  return String(res.data || '')
}

function deepWalk(obj, fn) {
  if (!obj || typeof obj !== 'object') return
  fn(obj)
  if (Array.isArray(obj)) {
    for (const x of obj) deepWalk(x, fn)
    return
  }
  for (const k of Object.keys(obj)) deepWalk(obj[k], fn)
}

function parseRunsText(runs) {
  const arr = safeArray(runs)
  return cleanText(arr.map((r) => r?.text || '').join(''))
}

function parseShortViewCountText(text) {
  const t = cleanText(text).toLowerCase()
  if (!t) return { views: null, viewText: null }
  const views = toInt(t)
  return { views, viewText: text || null }
}

function parseVideoRenderer(vr) {
  const videoId = vr?.videoId || null
  const url =
    normalizeUrl(vr?.navigationEndpoint?.commandMetadata?.webCommandMetadata?.url) ||
    (videoId ? `https://www.youtube.com/watch?v=${videoId}` : null)

  const title =
    parseRunsText(vr?.title?.runs) ||
    cleanText(vr?.title?.simpleText) ||
    null

  const durationText =
    cleanText(vr?.lengthText?.simpleText) ||
    parseRunsText(vr?.lengthText?.runs) ||
    null

  const durationSec = parseDurationSeconds(durationText)

  const authorName =
    parseRunsText(vr?.ownerText?.runs) ||
    cleanText(vr?.ownerText?.simpleText) ||
    null

  const authorChannelId =
    vr?.ownerText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId ||
    null

  const authorUrl =
    normalizeUrl(
      vr?.ownerText?.runs?.[0]?.navigationEndpoint?.commandMetadata?.webCommandMetadata?.url
    ) || (authorChannelId ? `https://www.youtube.com/channel/${authorChannelId}` : null)

  const { views, viewText } = parseShortViewCountText(
    vr?.viewCountText?.simpleText || parseRunsText(vr?.viewCountText?.runs)
  )

  const published =
    cleanText(vr?.publishedTimeText?.simpleText) ||
    parseRunsText(vr?.publishedTimeText?.runs) ||
    null

  const thumbnail = pickBestThumbnail(vr?.thumbnail?.thumbnails)

  return {
    type: 'video',
    videoId,
    url,
    title,
    timestamp: durationText,
    seconds: durationSec,
    views,
    viewsText: viewText,
    ago: published,
    author: authorName
      ? { name: authorName, channelId: authorChannelId, url: authorUrl }
      : null,
    thumbnail
  }
}

function parseChannelRenderer(cr) {
  const channelId = cr?.channelId || null
  const url =
    normalizeUrl(
      cr?.navigationEndpoint?.commandMetadata?.webCommandMetadata?.url
    ) || (channelId ? `https://www.youtube.com/channel/${channelId}` : null)

  const name =
    parseRunsText(cr?.title?.runs) || cleanText(cr?.title?.simpleText) || null

  const description =
    parseRunsText(cr?.descriptionSnippet?.runs) ||
    cleanText(cr?.descriptionSnippet?.simpleText) ||
    null

  const thumbnail = pickBestThumbnail(cr?.thumbnail?.thumbnails)

  const subsText =
    cleanText(cr?.subscriberCountText?.simpleText) ||
    parseRunsText(cr?.subscriberCountText?.runs) ||
    null

  return {
    type: 'channel',
    channelId,
    url,
    name,
    description,
    subscribersText: subsText,
    thumbnail
  }
}

function parsePlaylistRenderer(pr) {
  const listId = pr?.playlistId || null
  const url =
    normalizeUrl(
      pr?.navigationEndpoint?.commandMetadata?.webCommandMetadata?.url
    ) || (listId ? `https://www.youtube.com/playlist?list=${listId}` : null)

  const title =
    parseRunsText(pr?.title?.runs) ||
    cleanText(pr?.title?.simpleText) ||
    null

  const videoCountText =
    cleanText(pr?.videoCountText?.simpleText) ||
    parseRunsText(pr?.videoCountText?.runs) ||
    null

  const thumbnail = pickBestThumbnail(pr?.thumbnails?.[0]?.thumbnails || pr?.thumbnail?.thumbnails)

  const authorName =
    parseRunsText(pr?.shortBylineText?.runs) ||
    cleanText(pr?.shortBylineText?.simpleText) ||
    null

  return {
    type: 'playlist',
    listId,
    url,
    title,
    videoCountText,
    author: authorName ? { name: authorName } : null,
    thumbnail
  }
}

function buildSearchResults(initialData) {
  const videos = []
  const channels = []
  const playlists = []
  const live = []

  deepWalk(initialData, (node) => {
    if (node?.videoRenderer) {
      const v = parseVideoRenderer(node.videoRenderer)
      if (v?.videoId) {
        const isLive =
          !!node.videoRenderer?.badges?.some((b) =>
            (b?.metadataBadgeRenderer?.label || '').toLowerCase().includes('live')
          ) ||
          !!node.videoRenderer?.thumbnailOverlays?.some((o) =>
            (o?.thumbnailOverlayTimeStatusRenderer?.style || '').toLowerCase().includes('live')
          )

        if (isLive) live.push(v)
        else videos.push(v)
      }
    }
    if (node?.channelRenderer) {
      const c = parseChannelRenderer(node.channelRenderer)
      if (c?.channelId) channels.push(c)
    }
    if (node?.playlistRenderer) {
      const p = parsePlaylistRenderer(node.playlistRenderer)
      if (p?.listId) playlists.push(p)
    }
  })

  return { videos, channels, playlists, live }
}

async function search(query, opts) {
  const q = cleanText(query)
  if (!q) throw new Error('query requerida')

  const hl = cleanText(opts?.hl) || 'en'
  const gl = cleanText(opts?.gl) || 'US'

  const url =
    'https://www.youtube.com/results?search_query=' +
    encodeURIComponent(q) +
    `&hl=${encodeURIComponent(hl)}&gl=${encodeURIComponent(gl)}`

  const html = await httpGet(url, opts?.timeout)
  const initialData =
    extractJsonObject(html, 'var ytInitialData =') ||
    extractJsonObject(html, 'window["ytInitialData"] =') ||
    extractJsonObject(html, 'ytInitialData =')

  if (!initialData) {
    throw new Error('No se pudo extraer ytInitialData (posible bloqueo/consent)')
  }

  return {
    query: q,
    ...buildSearchResults(initialData)
  }
}

function pickTextFromRunsOrSimple(obj) {
  return (
    parseRunsText(obj?.runs) ||
    cleanText(obj?.simpleText) ||
    null
  )
}

async function getVideo(videoId, opts) {
  const id = cleanText(videoId)
  if (!id) throw new Error('videoId requerido')

  const hl = cleanText(opts?.hl) || 'en'
  const gl = cleanText(opts?.gl) || 'US'

  const url = `https://www.youtube.com/watch?v=${encodeURIComponent(id)}&hl=${encodeURIComponent(hl)}&gl=${encodeURIComponent(gl)}`
  const html = await httpGet(url, opts?.timeout)

  const player =
    extractJsonObject(html, 'var ytInitialPlayerResponse =') ||
    extractJsonObject(html, 'window["ytInitialPlayerResponse"] =') ||
    extractJsonObject(html, 'ytInitialPlayerResponse =')

  if (!player) throw new Error('No se pudo extraer ytInitialPlayerResponse')

  const details = player?.videoDetails || {}
  const micro = player?.microformat?.playerMicroformatRenderer || {}

  const title = cleanText(details?.title) || null
  const description = cleanText(details?.shortDescription) || null
  const lengthSeconds = Number(details?.lengthSeconds)
  const seconds = Number.isFinite(lengthSeconds) ? lengthSeconds : null

  const duration = seconds != null
    ? {
        seconds,
        timestamp: seconds >= 3600
          ? `${Math.floor(seconds / 3600)}:${String(Math.floor((seconds % 3600) / 60)).padStart(2,'0')}:${String(seconds % 60).padStart(2,'0')}`
          : `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2,'0')}`
      }
    : { seconds: null, timestamp: null }

  const viewCount = Number(details?.viewCount)
  const views = Number.isFinite(viewCount) ? viewCount : null

  const publishDate = cleanText(micro?.publishDate) || null
  const uploadDate = cleanText(micro?.uploadDate) || null

  const authorName = cleanText(details?.author) || null
  const channelId = cleanText(details?.channelId) || null

  const thumbnail = pickBestThumbnail(details?.thumbnail?.thumbnails)

  return {
    type: 'video',
    videoId: id,
    url: `https://www.youtube.com/watch?v=${id}`,
    title,
    description,
    duration,
    views,
    author: authorName ? { name: authorName, channelId } : null,
    thumbnail,
    publishDate,
    uploadDate,
    keywords: safeArray(details?.keywords)
  }
}

function parsePlaylistVideosFromInitialData(initialData) {
  const videos = []

  deepWalk(initialData, (node) => {
    const vr = node?.playlistVideoRenderer
    if (!vr) return
    const videoId = vr?.videoId || null
    const url = videoId ? `https://www.youtube.com/watch?v=${videoId}` : null

    const title = pickTextFromRunsOrSimple(vr?.title)
    const thumbnail = pickBestThumbnail(vr?.thumbnail?.thumbnails)

    const durationText = pickTextFromRunsOrSimple(vr?.lengthText)
    const seconds = parseDurationSeconds(durationText)

    const authorName = parseRunsText(vr?.shortBylineText?.runs) || null

    videos.push({
      videoId,
      url,
      title,
      timestamp: durationText,
      seconds,
      author: authorName ? { name: authorName } : null,
      thumbnail
    })
  })

  return videos
}

async function getPlaylist(listId, opts) {
  const id = cleanText(listId)
  if (!id) throw new Error('listId requerido')

  const hl = cleanText(opts?.hl) || 'en'
  const gl = cleanText(opts?.gl) || 'US'

  const url = `https://www.youtube.com/playlist?list=${encodeURIComponent(id)}&hl=${encodeURIComponent(hl)}&gl=${encodeURIComponent(gl)}`
  const html = await httpGet(url, opts?.timeout)

  const initialData =
    extractJsonObject(html, 'var ytInitialData =') ||
    extractJsonObject(html, 'window["ytInitialData"] =') ||
    extractJsonObject(html, 'ytInitialData =')

  if (!initialData) throw new Error('No se pudo extraer ytInitialData')

  let title = null
  let channelName = null
  let channelId = null

  deepWalk(initialData, (node) => {
    if (title) return
    const header = node?.playlistHeaderRenderer
    if (header) {
      title = pickTextFromRunsOrSimple(header?.title) || title
      channelName = pickTextFromRunsOrSimple(header?.ownerText) || channelName
      channelId =
        header?.ownerEndpoint?.browseEndpoint?.browseId ||
        channelId
    }
  })

  const videos = parsePlaylistVideosFromInitialData(initialData)

  return {
    type: 'playlist',
    listId: id,
    url: `https://www.youtube.com/playlist?list=${id}`,
    title,
    author: channelName ? { name: channelName, channelId } : null,
    videos
  }
}

function ytSearch(input, cb) {
  let opts = input

  if (typeof input === 'string') {
    opts = { query: input }
  } else if (!input || typeof input !== 'object') {
    opts = {}
  }

  const run = async () => {
    if (opts.videoId) return getVideo(opts.videoId, opts)
    if (opts.listId) return getPlaylist(opts.listId, opts)
    const q = opts.query || opts.search || opts.q
    return search(q, opts)
  }

  if (typeof cb === 'function') {
    run()
      .then((r) => cb(null, r))
      .catch((e) => cb(e))
    return
  }

  return run()
}

ytSearch.search = search
ytSearch.video = getVideo
ytSearch.playlist = getPlaylist

module.exports = ytSearch
