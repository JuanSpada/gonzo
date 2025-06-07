const express = require("express");
const app = express();
app.use(express.json()); // Para leer JSON body
app.use(express.urlencoded({ extended: true })); // Para leer form-urlencoded body

const port = 3000;

// app.use((req, res, next) => {
//   const start = Date.now();
//   res.on("finish", () => {
//     const duration = Date.now() - start;
//     // Use req.ip to get the real client IP
//     console.log(
//       `[${new Date().toISOString()}] ${req.ip} ${req.method} ${
//         req.originalUrl
//       } ${res.statusCode} ${duration}ms User-Agent: ${
//         req.headers["user-agent"]
//       }`
//     );
//   });
//   next();
// });
app.use((req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;

    console.log("\n========== NUEVO REQUEST ==========");
    console.log(`Fecha: ${new Date().toISOString()}`);
    console.log(`Método: ${req.method}`);
    console.log(`URL: ${req.originalUrl}`);
    console.log(`Status: ${res.statusCode}`);
    console.log(`Duración: ${duration}ms`);
    console.log(`IP: ${req.ip}`);
    console.log(`IPs (cadena de proxies): ${req.ips}`);
    console.log("User-Agent:", req.headers["user-agent"]);
    console.log("Referer:", req.headers.referer || req.headers.referrer);
    console.log("Host:", req.headers.host);
    console.log("Query Params:", req.query);
    console.log("Body:", req.body);
    console.log("Headers:", req.headers);
    console.log("====================================\n");
  });

  next();
});

app.get("/gonzo", (req, res) => {
  console.log("Received headers:", req.headers);
  res.send("Security test API");
});

app.listen(port, () => {
  console.log(`API listening at http://localhost:${port}`);
});
