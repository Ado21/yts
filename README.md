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

### 1) Busqueda general (Promise / async-await)

```js
const ytSearch = require('yt-search')

async function main() {
  const result = await ytSearch({
    query: 'lofi hip hop',
    hl: 'en',
    gl: 'US'
  })

  console.log('Videos:', result.videos.length)
  console.log('Canales:', result.channels.length)
  console.log('Playlists:', result.playlists.length)
  console.log('En vivo:', result.live.length)

  const first = result.videos[0]
  if (first) {
    console.log('Primer video:', first.title)
    console.log('URL:', first.url)
  }
}

main().catch(console.error)
```

### 2) Busqueda simple con string

```js
const ytSearch = require('yt-search')

ytSearch('ambient focus music')
  .then((r) => {
    console.log('Resultados:', r.videos.length)
  })
  .catch(console.error)
```

### 3) Modo callback (compatibilidad)

```js
const ytSearch = require('yt-search')

ytSearch('chill beats', (err, data) => {
  if (err) return console.error(err)
  console.log('Top result:', data.videos[0]?.title)
})
```

### 4) Obtener metadata de un video por `videoId`

```js
const ytSearch = require('yt-search')

async function getVideo() {
  const info = await ytSearch({
    videoId: 'dQw4w9WgXcQ'
  })

  console.log(info.title)
  console.log(info.duration)
  console.log(info.views)
}

getVideo().catch(console.error)
```

### 5) Obtener datos de playlist por `listId`

```js
const ytSearch = require('yt-search')

async function getPlaylist() {
  const p = await ytSearch({
    listId: 'PLFgquLnL59alCl_2TQvOiD5Vgm1hCaGSI'
  })

  console.log('Playlist:', p.title)
  console.log('Videos:', p.videos.length)
  console.log('Primero:', p.videos[0]?.title)
}

getPlaylist().catch(console.error)
```

---

## API Rapida

- `ytSearch(queryString)`
- `ytSearch({ query, hl, gl, timeout })`
- `ytSearch({ videoId, hl, gl, timeout })`
- `ytSearch({ listId, hl, gl, timeout })`
- `ytSearch(input, callback)`

Metodos directos:

- `ytSearch.search(query, opts)`
- `ytSearch.video(videoId, opts)`
- `ytSearch.playlist(listId, opts)`

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
