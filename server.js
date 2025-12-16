// ===== 必要モジュール =====
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// ===== アプリ設定 =====
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// ===== 静的ファイル =====
app.use(express.static("public"));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ===== uploads フォルダ作成（Render対策） =====
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// ===== multer 設定 =====
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const unique =
      Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// ===== 管理データ =====
let buttons = {}; 
// buttons = {
//   id: { name: "第1問", images: ["/uploads/xxx.png"] }
// }

let currentDisplay = {
  visible: false,
  images: []
};

// ===== 管理者ID/PW =====
const ADMIN_ID = "nakanishi";
const ADMIN_PW = "nakanishi47364976";

// ===== 画像アップロードAPI =====
app.post("/upload", upload.array("images"), (req, res) => {
  try {
    const urls = req.files.map(file => "/uploads/" + file.filename);
    res.json(urls);
  } catch (err) {
    res.status(500).json({ error: "upload failed" });
  }
});

// ===== Socket.IO =====
io.on("connection", socket => {

  socket.isAdmin = false;

  // 初期データ送信
  socket.emit("init", {
    buttons,
    currentDisplay
  });

  // --- 管理者ログイン ---
  socket.on("login", ({ id, pw }) => {
    if (id === ADMIN_ID && pw === ADMIN_PW) {
      socket.isAdmin = true;
      socket.emit("loginOK");
    } else {
      socket.emit("loginNG");
    }
  });

  // --- ボタン追加 ---
  socket.on("addButton", ({ id, name }) => {
    if (!socket.isAdmin) return;
    buttons[id] = { name, images: [] };
    io.emit("buttons", buttons);
  });

  // --- ボタン削除 ---
  socket.on("deleteButton", id => {
    if (!socket.isAdmin) return;
    delete buttons[id];
    io.emit("buttons", buttons);
  });

  // --- 画像追加 ---
  socket.on("addImages", ({ id, images }) => {
    if (!socket.isAdmin) return;
    if (!buttons[id]) return;
    buttons[id].images.push(...images);
    io.emit("buttons", buttons);
  });

  // --- 表示 ---
  socket.on("show", id => {
    if (!socket.isAdmin) return;
    if (!buttons[id]) return;

    currentDisplay = {
      visible: true,
      images: buttons[id].images
    };
    io.emit("display", currentDisplay);
  });

  // --- 非表示 ---
  socket.on("hide", () => {
    if (!socket.isAdmin) return;
    currentDisplay.visible = false;
    io.emit("display", currentDisplay);
  });

});

// ===== サーバー起動（Render必須） =====
server.listen(process.env.PORT || 3000, () => {
  console.log("Server running");
});
