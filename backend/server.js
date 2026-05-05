const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

const attachmentRoute = require("./routes/attachment");
const documentRoute = require("./routes/document");
const { initOdoo, connectOdoo } = require("./odoo");

app.use("/api/attachments", attachmentRoute);
app.use("/api/documents", documentRoute);

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Thiếu tên đăng nhập hoặc mật khẩu" });
  }

  try {
    initOdoo(username, password);
    const uid = await connectOdoo();

    if (![500, 7, 1903, 460].includes(uid)) {
      return res.status(403).json({ error: "Tài khoản của bạn không có quyền truy cập!" });
    }

    res.status(200).json({ message: "Đăng nhập thành công" });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ error: "Đăng nhập thất bại, vui lòng kiểm tra lại tài khoản." });
  }
});

app.listen(3001, () => {
  console.log("Server running on port 3001");
});
