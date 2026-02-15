<h1 align="center">
  <span style="color:#FF0000;">[YTS] yt-search</span>
  <span style="color:#FFFFFF;">YouTube Search Toolkit</span>
</h1>

<p align="center">
  <img src="https://img.shields.io/badge/Version-1.0.1-FF0000?style=for-the-badge&logo=github&logoColor=white" />
  <img src="https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/Estado-Activo-00C2FF?style=for-the-badge" />
</p>

---

`yt-search` es una libreria para buscar contenido de YouTube y obtener datos estructurados de:

- Videos
- Canales
- Playlists
- Streams en vivo

Tambien permite consultar datos directos de un `videoId` o `listId`.

> [!IMPORTANT]
> Esta libreria hace scraping de YouTube. La disponibilidad depende de la conectividad y posibles bloqueos de red/regionales.

---

## Requisitos

- **Node.js** `18+`
- **npm**

---

## Instalacion

```bash
npm install github:Ado21/yts
```

Tambien puedes declararlo directo en tu `package.json`:

```json
{
  "dependencies": {
    "yt-search": "github:Ado21/yts"
  }
}
```

---

## Uso en JavaScript

### 1) Forma corta (string)

```js
const ytSearch = require('yt-search')

async function main() {
  const result = await ytSearch('lofi hip hop')
  console.log(result.videos.length)
}

main().catch(console.error)
```

### 2) Forma objeto con `query`

```js
const ytSearch = require('yt-search')

const result = await ytSearch({
  query: 'ambient focus music'
})

console.log('Videos:', result.videos.length)
console.log('Canales:', result.channels.length)
console.log('Playlists:', result.playlists.length)
console.log('Live:', result.live.length)
```

### 3) Alias de busqueda: `search`

```js
const ytSearch = require('yt-search')

const result = await ytSearch({
  search: 'drum and bass mix'
})

console.log(result.videos[0]?.title)
```

### 4) Alias de busqueda: `q`

```js
const ytSearch = require('yt-search')

const result = await ytSearch({
  q: 'synthwave 80s'
})

console.log(result.videos[0]?.url)
```

### 5) Con opciones regionales y timeout (`hl`, `gl`, `timeout`)

```js
const ytSearch = require('yt-search')

const result = await ytSearch({
  query: 'reggaeton old school',
  hl: 'es',
  gl: 'MX',
  timeout: 60000
})

console.log(result.query)
console.log(result.videos.length)
```

### 6) Modo callback con string

```js
const ytSearch = require('yt-search')

ytSearch('chill beats', (err, data) => {
  if (err) return console.error(err)
  console.log('Top:', data.videos[0]?.title)
})
```

### 7) Modo callback con objeto

```js
const ytSearch = require('yt-search')

ytSearch({ query: 'house music', hl: 'en', gl: 'US' }, (err, data) => {
  if (err) return console.error(err)
  console.log('Playlists:', data.playlists.length)
})
```

### 8) Obtener metadata de un video (`videoId`)

```js
const ytSearch = require('yt-search')

const info = await ytSearch({
  videoId: 'dQw4w9WgXcQ'
})

console.log(info.type)        // "video"
console.log(info.title)
console.log(info.duration)    // { seconds, timestamp }
console.log(info.views)
console.log(info.author)
```

### 9) Obtener playlist por ID (`listId`)

```js
const ytSearch = require('yt-search')

const playlist = await ytSearch({
  listId: 'PLFgquLnL59alCl_2TQvOiD5Vgm1hCaGSI'
})

console.log(playlist.type)      // "playlist"
console.log(playlist.title)
console.log(playlist.videos.length)
console.log(playlist.videos[0])
```

### 10) Metodo directo: `ytSearch.search(query, opts)`

```js
const ytSearch = require('yt-search')

const result = await ytSearch.search('jazz lofi', {
  hl: 'en',
  gl: 'US',
  timeout: 45000
})

console.log(result.videos.length)
```

### 11) Metodo directo: `ytSearch.video(videoId, opts)`

```js
const ytSearch = require('yt-search')

const video = await ytSearch.video('dQw4w9WgXcQ', {
  hl: 'en',
  gl: 'US',
  timeout: 45000
})

console.log(video.title)
```

### 12) Metodo directo: `ytSearch.playlist(listId, opts)`

```js
const ytSearch = require('yt-search')

const p = await ytSearch.playlist('PLFgquLnL59alCl_2TQvOiD5Vgm1hCaGSI', {
  hl: 'en',
  gl: 'US',
  timeout: 45000
})

console.log(p.title)
```

### 13) Manejo de errores recomendado

```js
const ytSearch = require('yt-search')

try {
  const result = await ytSearch({ query: 'test' })
  console.log(result.videos.length)
} catch (err) {
  console.error('Fallo:', err.message)
}
```

---

## API Rapida

- `ytSearch(queryString)`
- `ytSearch({ query, hl, gl, timeout })`
- `ytSearch({ search, hl, gl, timeout })`
- `ytSearch({ q, hl, gl, timeout })`
- `ytSearch({ videoId, hl, gl, timeout })`
- `ytSearch({ listId, hl, gl, timeout })`
- `ytSearch(input, callback)` 

Metodos directos:

- `ytSearch.search(query, opts)`
- `ytSearch.video(videoId, opts)`
- `ytSearch.playlist(listId, opts)`

Prioridad interna de opciones:

- Si envias `videoId`, se usa modo video.
- Si no hay `videoId` pero hay `listId`, se usa modo playlist.
- Si no hay `videoId` ni `listId`, usa `query || search || q`.

---

## Uso CLI

```bash
node bin/cli.js "lofi hip hop"
```

Bandera de version:

```bash
node bin/cli.js --version
```

---

## Notas

- Si aparece `EAI_AGAIN` o `ENOTFOUND`, es un problema de red/DNS al resolver `www.youtube.com`.
- Algunas respuestas de YouTube pueden variar por pais (`gl`) e idioma (`hl`).

---

## Autor

<p align="center">
  <a href="https://github.com/Ado21">
    <img src="https://github.com/Ado21.png" width="180" height="180" alt="Ado" style="border-radius: 18px;" />
  </a>
</p>

---

## Licencia

MIT
