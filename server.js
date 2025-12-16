const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

let currentDisplay = {
  visible: false,
  materials: []
};

// 管理者ID・PW（簡易）
const ADMIN_ID = "admin";
const ADMIN_PW = "1234";

io.on("connection", (socket) => {
  // 初期状態送信
  socket.emit("update", currentDisplay);

  // 管理者ログイン
  socket.on("login", ({ id, pw }) => {
    if (id === ADMIN_ID && pw === ADMIN_PW) {
      socket.emit("loginSuccess");
    } else {
      socket.emit("loginFail");
    }
  });

  // 表示
  socket.on("show", (materials) => {
    currentDisplay = { visible: true, materials };
    io.emit("update", currentDisplay);
  });

  // 非表示
  socket.on("hide", () => {
    currentDisplay.visible = false;
    io.emit("update", currentDisplay);
  });
});

server.listen(process.env.PORT || 3000);
