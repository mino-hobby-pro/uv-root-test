const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const yts = require('youtube-search-api');
const app = express();

app.use(cors());

const LASTFM_KEY = 'c980340f222bb2fe35de93fa3dcafac1';
const USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36';

// --- ストリーム取得エンドポイント ---
app.get('/api/mp3/:videoId', async (req, res) => {
    const videoId = req.params.videoId;
    const cliptoUrl = `https://www.clipto.com/api/youtube/mp3?url=https://www.youtube.com/watch?v=${videoId}&csrfToken=mlD3PL33-WlY6O4MHQoC2QElvSEk2nEBiSVQ`;

    try {
        const response = await fetch(cliptoUrl, {
            method: 'GET',
            headers: { 'User-Agent': USER_AGENT }
        });

        if (!response.ok) throw new Error('Source failed');

        // 【最重要】ダウンロードを阻止し、ストリームとして処理するためのヘッダー操作
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Accept-Ranges', 'bytes');
        // Content-Dispositionヘッダーを意図的に削除またはinlineに設定することで、保存ダイアログを防ぐ
        res.setHeader('Content-Disposition', 'inline'); 
        
        // 元のAPIから送られてくるContent-Lengthがあれば引き継ぐ（シーク精度向上のため）
        const contentLength = response.headers.get('content-length');
        if (contentLength) res.setHeader('Content-Length', contentLength);

        // データをパイプ（中継）する
        response.body.pipe(res);

    } catch (err) {
        console.error("Stream Error:", err);
        res.status(502).json({ error: "Failed to fetch stream" });
    }
});

// --- YouTube ID特定 ---
app.get('/api/get-video', async (req, res) => {
    try {
        const results = await yts.GetListByKeyword(`${req.query.artist} ${req.query.track}`, false, 1);
        res.json({ videoId: results?.items[0]?.id || null });
    } catch (err) { res.status(500).send(err); }
});

// --- レコメンド用: 類似アーティスト・曲の取得 ---
app.get('/api/recommend', async (req, res) => {
    const { artist } = req.query;
    try {
        // 類似アーティスト取得
        const simRes = await fetch(`https://ws.audioscrobbler.com/2.0/?method=artist.getsimilar&artist=${encodeURIComponent(artist)}&api_key=${LASTFM_KEY}&format=json&limit=5`);
        const simData = await simRes.json();
        const similarArtists = simData.similarartists?.artist || [];

        // 類似アーティストからランダムに1人選び、そのトップトラックを返す
        const targetArtist = similarArtists[Math.floor(Math.random() * similarArtists.length)]?.name || artist;
        const tracksRes = await fetch(`https://ws.audioscrobbler.com/2.0/?method=artist.gettoptracks&artist=${encodeURIComponent(targetArtist)}&api_key=${LASTFM_KEY}&format=json&limit=10`);
        const tracksData = await tracksRes.json();
        
        res.json(tracksData.toptracks?.track || []);
    } catch (err) { res.status(500).send([]); }
});

module.exports = app;
