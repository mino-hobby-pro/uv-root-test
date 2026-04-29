const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const yts = require('youtube-search-api');
const app = express();

app.use(cors());

const LASTFM_KEY = 'c980340f222bb2fe35de93fa3dcafac1';

// --- 最強のMP3ストリーム・プロキシ (エラー時は502を返しフロントのフォールバックを誘発) ---
app.get('/api/mp3/:videoId', async (req, res) => {
    const videoId = req.params.videoId;
    if (!videoId) return res.status(400).send("Video ID is required");

    const cliptoUrl = `https://www.clipto.com/api/youtube/mp3?url=https://www.youtube.com/watch?v=${videoId}&csrfToken=mlD3PL33-WlY6O4MHQoC2QElvSEk2nEBiSVQ`;

    try {
        const response = await fetch(cliptoUrl, {
            method: 'GET',
            redirect: 'follow',
            headers: { 
                'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36',
                'Accept': 'audio/mpeg, audio/*;q=0.9, */*;q=0.8',
                'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
                'Connection': 'keep-alive'
            },
            timeout: 8000 // 8秒で応答がなければフォールバックへ移行
        });

        if (!response.ok) throw new Error(`Upstream Error: ${response.status}`);

        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Transfer-Encoding', 'chunked');
        res.setHeader('Cache-Control', 'no-cache');
        
        // ストリームをクライアントにパイプ
        response.body.pipe(res);

        // 相手側が切断した場合のメモリリーク防止
        req.on('close', () => {
            if (!response.body.destroyed) response.body.destroy();
        });

    } catch (err) {
        console.error(`[Stream Error] ${videoId}:`, err.message);
        // audio要素ではHTMLを再生できないため、502エラーを返し、
        // クライアント(JS)側の audio.onerror を発火させてiframeへフォールバックさせます。
        res.status(502).json({ error: "Stream unreachable", fallback: true });
    }
});

// --- YouTube動画IDの高速特定 ---
app.get('/api/get-video', async (req, res, next) => {
    const { artist, track } = req.query;
    try {
        const results = await yts.GetListByKeyword(`${artist} ${track}`, false, 1);
        res.json({ videoId: results?.items[0]?.id || null });
    } catch (err) { next(err); }
});

// --- 究極のSupermixアルゴリズム ---
app.get('/api/supermix', async (req, res, next) => {
    const artistsParam = req.query.artists; 
    if (!artistsParam) return res.json([]);
    // 最新の好みを優先するため、逆順にして最大3組のシードを抽出
    const artists = artistsParam.split(',').reverse().slice(0, 3); 

    try {
        let mixTracks = [];
        const fetchTop = async (artist, limit) => {
            const res = await fetch(`https://ws.audioscrobbler.com/2.0/?method=artist.gettoptracks&artist=${encodeURIComponent(artist)}&api_key=${LASTFM_KEY}&format=json&limit=${limit}`);
            const data = await res.json();
            return data.toptracks?.track || [];
        };

        for (const artist of artists) {
            // 本人の名曲
            mixTracks.push(...await fetchTop(artist, 6));
            // 類似アーティストの発掘
            const simRes = await fetch(`https://ws.audioscrobbler.com/2.0/?method=artist.getsimilar&artist=${encodeURIComponent(artist)}&api_key=${LASTFM_KEY}&format=json&limit=3`);
            const simData = await simRes.json();
            if (simData.similarartists?.artist) {
                for (const sim of simData.similarartists.artist) {
                    mixTracks.push(...await fetchTop(sim.name, 4));
                }
            }
        }

        // 重複排除
        let uniqueTracks = Array.from(new Map(mixTracks.map(t => [`${t.name}-${t.artist.name}`, t])).values());
        
        // Fisher-Yates 完璧なシャッフル
        for (let i = uniqueTracks.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [uniqueTracks[i], uniqueTracks[j]] = [uniqueTracks[j], uniqueTracks[i]];
        }
        res.json(uniqueTracks);
    } catch (err) { next(err); }
});

app.get('/api/chart', async (req, res) => {
    const response = await fetch(`https://ws.audioscrobbler.com/2.0/?method=chart.gettoptracks&api_key=${LASTFM_KEY}&format=json&limit=40`);
    const data = await response.json();
    res.json(data.tracks.track);
});

app.get('/api/search', async (req, res) => {
    const query = req.query.q;
    const response = await fetch(`https://ws.audioscrobbler.com/2.0/?method=track.search&track=${encodeURIComponent(query)}&api_key=${LASTFM_KEY}&format=json&limit=30`);
    const data = await response.json();
    res.json(data.results.trackmatches.track);
});

module.exports = app;
