const express = require('express');
const path = require('path');
const app = express();

// ルート / で 'test' を返す
app.get('/', (req, res) => {
  res.send('test');
});

// /abyss へのアクセスで abyss フォルダ内の静的ファイルを配信
// index: true により、/abyss/ アクセス時に index.html が自動で呼ばれます
app.use('/abyss', express.static(path.join(__dirname, 'abyss'), {
  index: 'index.html'
}));

// ローカル開発用のポート設定
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

// Vercelで動作させるためにappをエクスポート
module.exports = app;
