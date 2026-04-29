const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const yts = require('youtube-search-api');
const app = express();

app.use(cors());

const LASTFM_KEY = 'c980340f222bb2fe35de93fa3dcafac1';

// 1. YouTube動画検索 (youtube-search-api 使用)
// アーティスト名 + 曲名で、最も関連性の高い動画IDを1つ返す
app.get('/api/get-video', async (req, res, next) => {
    const { artist, track } = req.query;
    if (!artist || !track) return res.status(400).json({ error: "Missing params" });
    
    const query = `${artist} ${track}`;
    try {
        const results = await yts.GetListByKeyword(query, false, 1);
        const video = results.items[0];
        res.json({ videoId: video ? video.id : null });
    } catch (err) { next(err); }
});

// 2. キーワード検索 (検索バー用)
app.get('/api/search', async (req, res, next) => {
    const query = req.query.q;
    if (!query) return res.status(400).json({ error: "Query required" });
    try {
        // Last.fmの検索結果を使い、正確なメタデータを取得
        const url = `https://ws.audioscrobbler.com/2.0/?method=track.search&track=${encodeURIComponent(query)}&api_key=${LASTFM_KEY}&format=json&limit=15`;
        const response = await fetch(url);
        const data = await response.json();
        res.json(data.results.trackmatches.track);
    } catch (err) { next(err); }
});

// 3. トレンド/チャート取得
app.get('/api/chart', async (req, res) => {
    const url = `https://ws.audioscrobbler.com/2.0/?method=chart.gettoptracks&api_key=${LASTFM_KEY}&format=json&limit=20`;
    const response = await fetch(url);
    const data = await response.json();
    res.json(data.tracks.track);
});

// 4. 次の推薦曲（類似曲）
app.get('/api/similar', async (req, res) => {
    const { artist, track } = req.query;
    const url = `https://ws.audioscrobbler.com/2.0/?method=track.getsimilar&artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(track)}&api_key=${LASTFM_KEY}&format=json&limit=10`;
    const response = await fetch(url);
    const data = await response.json();
    res.json(data.similartracks.track || []);
});

module.exports = app;
