const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));

/* ===== 画像アップロード設定 ===== */
if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");

const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

/* ===== データ ===== */
let buttons = {}; // { id: { name, images[] } }
let current = { visible: false, images: [] };

/* ===== 管理者 ===== */
const ADMIN_ID = "nakanishi";
const ADMIN_PW = "nakanishi1221";

/* ===== 画像アップロードAPI ===== */
app.post("/upload", upload.array("images"), (req, res) => {
  const urls = req.files.map(f => "/uploads/" + f.filename);
  res.json(urls);
});

/* ===== Socket ===== */
io.on("connection", socket => {

  socket.isAdmin = false;
  socket.emit("init", { buttons, current });

  socket.on("login", data => {
    if (data.id === ADMIN_ID && data.pw === ADMIN_PW) {
      socket.isAdmin = true;
      socket.emit("loginOK");
    } else {
      socket.emit("loginNG");
    }
  });

  socket.on("addButton", data => {
    if (!socket.isAdmin) return;
    buttons[data.id] = { name: data.name, images: [] };
    io.emit("buttons", buttons);
  });

  socket.on("deleteButton", id => {
    if (!socket.isAdmin) return;
    delete buttons[id];
    io.emit("buttons", buttons);
  });

  socket.on("addImages", data => {
    if (!socket.isAdmin) return;
    buttons[data.id].images.push(...data.images);
    io.emit("buttons", buttons);
  });

  socket.on("show", id => {
    if (!socket.isAdmin) return;
    current = { visible: true, images: buttons[id].images };
    io.emit("display", current);
  });

  socket.on("hide", () => {
    if (!socket.isAdmin) return;
    current.visible = false;
    io.emit("display", current);
  });

});

server.listen(process.env.PORT || 3000);
