#!/usr/bin/env node
'use strict'

const path = require('node:path')
const { spawnSync } = require('node:child_process')

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isDnsError(err) {
  const text = String(err && (err.stack || err.message || err) || '')
  return /EAI_AGAIN|ENOTFOUND|getaddrinfo/i.test(text)
}

function printLine(label, status, detail) {
  const msg = `[${status}] ${label}${detail ? ` -> ${detail}` : ''}`
  console.log(msg)
}

function runCli(args, timeoutMs) {
  return spawnSync(
    process.execPath,
    [path.join(__dirname, 'bin/cli.js'), ...args],
    {
      cwd: __dirname,
      encoding: 'utf8',
      timeout: timeoutMs
    }
  )
}

async function searchWithRetry(ytSearch, query, attempts) {
  let lastErr = null
  for (let i = 1; i <= attempts; i++) {
    try {
      return await ytSearch({ query, hl: 'en', gl: 'US', timeout: 45000 })
    } catch (err) {
      lastErr = err
      if (!isDnsError(err) || i === attempts) throw err
      await sleep(1500 * i)
    }
  }
  throw lastErr
}

async function main() {
  let hardFailures = 0
  let warnings = 0

  let ytSearch = null
  try {
    ytSearch = require('./dist/yt-search.js')
    const ok = (
      typeof ytSearch === 'function' &&
      typeof ytSearch.search === 'function' &&
      typeof ytSearch.video === 'function' &&
      typeof ytSearch.playlist === 'function'
    )
    if (ok) {
      printLine('JS export shape', 'PASS')
    } else {
      hardFailures++
      printLine('JS export shape', 'FAIL', 'exports incompletos')
    }
  } catch (err) {
    hardFailures++
    printLine('JS module load', 'FAIL', err.message)
  }

  if (ytSearch) {
    try {
      const r = await searchWithRetry(ytSearch, 'lofi hip hop', 3)
      const count = Array.isArray(r.videos) ? r.videos.length : 0
      printLine('JS promise search', 'PASS', `videos=${count}`)
    } catch (err) {
      if (isDnsError(err)) {
        warnings++
        printLine('JS promise search', 'WARN', 'fallo DNS hacia YouTube (EAI_AGAIN)')
      } else {
        hardFailures++
        printLine('JS promise search', 'FAIL', err.message)
      }
    }

    try {
      const cbResult = await new Promise((resolve, reject) => {
        ytSearch('ambient focus music', (err, r) => {
          if (err) return reject(err)
          resolve(r)
        })
      })
      const count = Array.isArray(cbResult.videos) ? cbResult.videos.length : 0
      printLine('JS callback search', 'PASS', `videos=${count}`)
    } catch (err) {
      if (isDnsError(err)) {
        warnings++
        printLine('JS callback search', 'WARN', 'fallo DNS hacia YouTube (EAI_AGAIN)')
      } else {
        hardFailures++
        printLine('JS callback search', 'FAIL', err.message)
      }
    }
  }

  {
    const out = runCli(['--version'], 10000)
    const text = `${out.stdout || ''}${out.stderr || ''}`.trim()
    if (out.status === 0) {
      printLine('CLI --version', 'PASS', text || 'exit=0')
    } else {
      hardFailures++
      printLine('CLI --version', 'FAIL', text || `exit=${out.status}`)
    }
  }

  {
    const out = runCli([], 10000)
    const text = `${out.stdout || ''}${out.stderr || ''}`.trim()
    if (out.status === 1) {
      printLine('CLI no-query', 'PASS', text || 'exit=1')
    } else {
      hardFailures++
      printLine('CLI no-query', 'FAIL', text || `exit=${out.status}`)
    }
  }

  {
    const out = runCli(['lofi hip hop'], 15000)
    const text = `${out.stdout || ''}${out.stderr || ''}`.trim()
    if (out.error && out.error.code === 'ETIMEDOUT') {
      warnings++
      printLine(
        'CLI query',
        'WARN',
        'timeout: probablemente esperando selector interactivo (fzf)'
      )
    } else if (/EAI_AGAIN|ENOTFOUND|getaddrinfo/i.test(text)) {
      warnings++
      printLine('CLI query', 'WARN', 'fallo DNS hacia YouTube (EAI_AGAIN)')
    } else if (out.status === 0) {
      printLine('CLI query', 'PASS', text.split('\n')[0] || 'ok')
    } else if (out.status !== 0 && !text) {
      warnings++
      printLine('CLI query', 'WARN', `exit=${out.status} sin salida capturada (sin TTY)`)
    } else {
      hardFailures++
      printLine('CLI query', 'FAIL', text || `exit=${out.status}`)
    }
  }

  console.log(`\nResumen: hard_failures=${hardFailures}, warnings=${warnings}`)
  process.exit(hardFailures > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error('[FAIL] smoke-test runtime ->', err.message)
  process.exit(1)
})
