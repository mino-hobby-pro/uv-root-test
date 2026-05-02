const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();

const PROXY_DIR = path.join(__dirname, 'proxy');

// 1. ルート直下のテスト
app.get('/', (req, res) => {
  res.send('test2');
});

const PROXY_ENDPOINTS = [
  'prxy',
  'baremux',
  'epoxy',
  'libcurl',
  'register-sw.mjs',
  'uv'
];

// 静的ファイルの提供設定
app.use('/proxy', express.static(PROXY_DIR));

app.use((req, res, next) => {
  // リクエストされたパスから先頭のスラッシュを取り除いた名前を取得
  const fileName = req.path.replace(/^\//, '');

  // もしリクエストが対象リストに含まれている場合
  if (PROXY_ENDPOINTS.includes(fileName)) {
    // PROXY_DIR 内の該当ファイルを指すパスを作成
    const targetPath = path.join(PROXY_DIR, fileName);

    // ファイルが存在するか確認して送信
    if (fs.existsSync(targetPath) && fs.lstatSync(targetPath).isFile()) {
      return res.sendFile(targetPath);
    }
  }

  next();
});

// Vercel環境およびローカルでの起動用
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running!`);
});

module.exports = app;
