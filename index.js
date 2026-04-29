const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const app = express();

app.use(cors()); // フロントエンドからのアクセスを許可

const API_KEY = 'c980340f222bb2fe35de93fa3dcafac1';
const BASE_URL = 'https://ws.audioscrobbler.com/2.0/';

// 1. トップチャート取得
app.get('/api/chart', async (req, res) => {
    try {
        const params = new URLSearchParams({
            method: 'chart.gettoptracks',
            api_key: API_KEY,
            format: 'json',
            limit: 15
        });
        const response = await fetch(`${BASE_URL}?${params}`);
        const data = await response.json();
        res.json(data.tracks.track);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch charts' });
    }
});

// 2. 楽曲検索
app.get('/api/search', async (req, res) => {
    const query = req.query.q;
    try {
        const params = new URLSearchParams({
            method: 'track.search',
            track: query,
            api_key: API_KEY,
            format: 'json',
            limit: 10
        });
        const response = await fetch(`${BASE_URL}?${params}`);
        const data = await response.json();
        res.json(data.results.trackmatches.track);
    } catch (err) {
        res.status(500).json({ error: 'Search failed' });
    }
});

// 3. 次の曲（似ている曲）の取得
app.get('/api/similar', async (req, res) => {
    const { artist, track } = req.query;
    try {
        const params = new URLSearchParams({
            method: 'track.getsimilar',
            artist: artist,
            track: track,
            api_key: API_KEY,
            format: 'json',
            limit: 5
        });
        const response = await fetch(`${BASE_URL}?${params}`);
        const data = await response.json();
        res.json(data.similartracks.track);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch similar tracks' });
    }
});

module.exports = app;
