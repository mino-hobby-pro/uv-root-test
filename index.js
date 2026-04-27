const express = require('express');
const path = require('path');
const fs = require('fs');
const serverless = require('serverless-http');

const app = express();
const PORT = process.env.PORT || 3000;
const ABYSS_DIR = path.join(__dirname, 'abyss');

// Root test: returns plain text "test"
app.get('/', (req, res) => {
  res.type('text').send('test');
});

// Serve static files under /abyss so each file is directly accessible
// index.html will be served automatically when requesting /abyss/ (trailing slash)
app.use('/abyss', express.static(ABYSS_DIR, {
  index: ['index.html', 'index.htm'],
  extensions: ['html', 'htm']
}));

// /abyss endpoint (without trailing slash) — list all files in /abyss
app.get('/abyss', (req, res, next) => {
  // If a directory index file exists and the request explicitly wants the directory,
  // express.static above will handle /abyss/ (with slash). Here we return a listing.
  fs.readdir(ABYSS_DIR, { withFileTypes: true }, (err, entries) => {
    if (err) {
      // If directory doesn't exist or other error, forward to error handler
      return next(err);
    }
    // Build list of filenames (files only)
    const files = entries
      .filter(e => e.isFile())
      .map(e => e.name);

    // Return JSON array of filenames and also plain text option
    // Client can use either; JSON is convenient for programmatic use.
    res.json({ files });
  });
});

// Optional: endpoint to return filenames as plain text (one per line)
app.get('/abyss/list.txt', (req, res, next) => {
  fs.readdir(ABYSS_DIR, { withFileTypes: true }, (err, entries) => {
    if (err) return next(err);
    const files = entries.filter(e => e.isFile()).map(e => e.name).join('\n');
    res.type('text').send(files);
  });
});

// Basic error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).type('text').send('Internal Server Error');
});

// Start server when run locally
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
    console.log(`Root test: http://localhost:${PORT}/`);
    console.log(`Abyss index: http://localhost:${PORT}/abyss`);
  });
}

// Export handler for serverless platforms (Vercel)
module.exports = serverless(app);
