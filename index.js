const express = require('express');
const path = require('path');
const fs = require('fs').promises;

const app = express();
const PORT = process.env.PORT || 3000;
const abyssDir = path.join(__dirname, 'abyss');

// Serve static files under /abyss/<filename>
app.use('/abyss', express.static(abyssDir, {
  index: false,
  extensions: ['html', 'htm']
}));

// Root test
app.get('/', (req, res) => {
  res.type('text/plain').send('test');
});

// /abyss -> list all files in abyss directory and return links
app.get('/abyss', async (req, res) => {
  try {
    const files = await fs.readdir(abyssDir, { withFileTypes: true });
    const fileNames = files
      .filter(f => f.isFile())
      .map(f => f.name);

    // Build simple HTML listing with links to each file
    const listHtml = fileNames.map(name => {
      const href = path.posix.join('/abyss', encodeURIComponent(name));
      return `<li><a href="${href}">${name}</a></li>`;
    }).join('\n');

    const html = `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <title>/abyss files</title>
</head>
<body>
  <h1>/abyss にあるファイル一覧</h1>
  <ul>
    ${listHtml}
  </ul>
</body>
</html>`;

    res.type('html').send(html);
  } catch (err) {
    console.error(err);
    res.status(500).type('text/plain').send('Failed to read abyss directory');
  }
});

// Fallback for other routes (optional): return 404
app.use((req, res) => {
  res.status(404).type('text/plain').send('Not Found');
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
