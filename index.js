const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();

const ABYSS_DIR = path.join(__dirname, 'abyss');

// 1. ルート直下のテスト
app.get('/', (req, res) => {
  res.send('test');
});

// 2. /abyss 自体の静的ファイル配信
app.use('/abyss', express.static(ABYSS_DIR));

// 3. 【重要】UVプロキシのパス置き換え検知＆自動解決ロジック
// ルート(/)や/abyss以外へのリクエスト（/static/等）が来た場合、abyss内を探しに行く
app.use((req, res, next) => {
  // リクエストされたパスが abyss フォルダ内に実在するかチェック
  const expectedPath = path.join(ABYSS_DIR, req.path);

  if (fs.existsSync(expectedPath) && fs.lstatSync(expectedPath).isFile()) {
    // ファイルが見つかったら、それを返す（これで /static/ が /abyss/static/ として機能する）
    return res.sendFile(expectedPath);
  }
  
  // 見つからない場合は次の処理（404など）へ
  next();
});

// Vercel環境およびローカルでの起動用
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running!`);
});

module.exports = app;
