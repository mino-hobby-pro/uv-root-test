const express = require('express');
const fetch = require('node-fetch');
const app = express();

const API_KEY = 'c980340f222bb2fe35de93fa3dcafac1';
const BASE_URL = 'https://ws.audioscrobbler.com/2.0/';

app.get('/api/recommendations', async (req, res) => {
    try {
        // Last.fmのチャート(Top Tracks)を取得
        const params = new URLSearchParams({
            method: 'chart.gettoptracks',
            api_key: API_KEY,
            format: 'json',
            limit: 10
        });

        const response = await fetch(`${BASE_URL}?${params}`);
        const data = await response.json();

        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch music data' });
    }
});

module.exports = app;
