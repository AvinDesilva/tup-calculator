"use strict";

const express = require("express");
const cookieParser = require("cookie-parser");
const { cors, rateLimiter } = require("./middleware");
const router = require("./routes");
const authRouter = require("./routes-auth");
const watchlistRouter = require("./routes-watchlist");
const { initDB } = require("./db");

initDB();

const app  = express();
const PORT = parseInt(process.env.PORT || "3001", 10);

app.use(express.json());
app.use(cookieParser());
app.use(cors);
app.use(rateLimiter);
app.use(router);
app.use("/auth", authRouter);
app.use("/watchlist", watchlistRouter);

app.listen(PORT, "127.0.0.1", () => {
  console.log(`[tup-proxy] listening on 127.0.0.1:${PORT}`);
});
