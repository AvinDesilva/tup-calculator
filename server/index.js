"use strict";

const express = require("express");
const { cors, rateLimiter } = require("./middleware");
const router = require("./routes");

const app  = express();
const PORT = parseInt(process.env.PORT || "3001", 10);

app.use(cors);
app.use(rateLimiter);
app.use(router);

app.listen(PORT, "127.0.0.1", () => {
  console.log(`[tup-proxy] listening on 127.0.0.1:${PORT}`);
});
