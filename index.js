const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const yts = require('youtube-search-api');
const app = express();

app.use(cors());

const LASTFM_KEY = 'c980340f222bb2fe35de93fa3dcafac1';

// --- 新機能: MP3ストリームのリダイレクト追跡と中継 ---
app.get('/api/mp3/:videoId', async (req, res, next) => {
    const videoId = req.params.videoId;
    if (!videoId) return res.status(400).send("Video ID is required");

    const cliptoUrl = `https://www.clipto.com/api/youtube/mp3?url=https://www.youtube.com/watch?v=${videoId}&csrfToken=YrbTGlag-GmobCwzxxjTpoIRHSM_n_JY-420`;

    try {
        // redirect: 'follow' により、最終的なMP3のURLまで自動で追跡します
        const response = await fetch(cliptoUrl, {
            method: 'GET',
            redirect: 'follow',
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });

        if (!response.ok) {
            throw new Error(`Upstream API failed with status ${response.status}`);
        }

        // ストリームのヘッダーを設定し、クライアント（HTMLの<audio>）へそのまま流し込む
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Transfer-Encoding', 'chunked');
        response.body.pipe(res);

    } catch (err) {
        console.error("MP3 Stream Error:", err);
        res.status(500).json({ error: "Failed to stream audio. The source might be unavailable." });
    }
});

// --- YouTube動画IDの取得 ---
app.get('/api/get-video', async (req, res, next) => {
    const { artist, track } = req.query;
    try {
        const results = await yts.GetListByKeyword(`${artist} ${track}`, false, 1);
        const video = results.items[0];
        res.json({ videoId: video ? video.id : null });
    } catch (err) { next(err); }
});

// --- 完璧なプレイリストアルゴリズム (Supermix) ---
// ユーザーが好むアーティスト群を入力とし、本人と類似アーティストから最適な曲を抽出・シャッフル
app.get('/api/supermix', async (req, res, next) => {
    const artistsParam = req.query.artists; 
    if (!artistsParam) return res.json([]);
    const artists = artistsParam.split(',').slice(0, 3); // 最大3アーティストをシードに

    try {
        let mixTracks = [];
        
        for (const artist of artists) {
            // 1. 本人のトップトラックを取得
            const topUrl = `https://ws.audioscrobbler.com/2.0/?method=artist.gettoptracks&artist=${encodeURIComponent(artist)}&api_key=${LASTFM_KEY}&format=json&limit=5`;
            const topRes = await fetch(topUrl);
            const topData = await topRes.json();
            if (topData.toptracks && topData.toptracks.track) mixTracks.push(...topData.toptracks.track);

            // 2. 類似アーティストを取得し、そのアーティストの代表曲を混ぜる
            const simUrl = `https://ws.audioscrobbler.com/2.0/?method=artist.getsimilar&artist=${encodeURIComponent(artist)}&api_key=${LASTFM_KEY}&format=json&limit=2`;
            const simRes = await fetch(simUrl);
            const simData = await simRes.json();
            
            if (simData.similarartists && simData.similarartists.artist) {
                for (const simArtist of simData.similarartists.artist) {
                    const simTopUrl = `https://ws.audioscrobbler.com/2.0/?method=artist.gettoptracks&artist=${encodeURIComponent(simArtist.name)}&api_key=${LASTFM_KEY}&format=json&limit=3`;
                    const simTopRes = await fetch(simTopUrl);
                    const simTopData = await simTopRes.json();
                    if (simTopData.toptracks && simTopData.toptracks.track) mixTracks.push(...simTopData.toptracks.track);
                }
            }
        }

        // 重複排除と高度なシャッフル（Fisher-Yates）
        const uniqueTracks = Array.from(new Map(mixTracks.map(t => [`${t.name}-${t.artist.name}`, t])).values());
        for (let i = uniqueTracks.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [uniqueTracks[i], uniqueTracks[j]] = [uniqueTracks[j], uniqueTracks[i]];
        }

        res.json(uniqueTracks);
    } catch (err) { next(err); }
});

// --- トレンドチャート取得 ---
app.get('/api/chart', async (req, res) => {
    const response = await fetch(`https://ws.audioscrobbler.com/2.0/?method=chart.gettoptracks&api_key=${LASTFM_KEY}&format=json&limit=30`);
    const data = await response.json();
    res.json(data.tracks.track);
});

// --- 検索機能 ---
app.get('/api/search', async (req, res) => {
    const query = req.query.q;
    const response = await fetch(`https://ws.audioscrobbler.com/2.0/?method=track.search&track=${encodeURIComponent(query)}&api_key=${LASTFM_KEY}&format=json&limit=20`);
    const data = await response.json();
    res.json(data.results.trackmatches.track);
});

module.exports = app;
