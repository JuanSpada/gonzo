import helmet from "helmet";
import express from "express";
import { rateLimit } from 'express-rate-limit'

const app = express();

const limiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
	standardHeaders: 'draft-8', // draft-6: `RateLimit-*` headers; draft-7 & draft-8: combined `RateLimit` header
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
})

// Apply the rate limiting middleware to all requests.
app.use(limiter)

app.use(helmet());
app.use(express.json()); // Para leer JSON body
app.use(express.urlencoded({ extended: true })); // Para leer form-urlencoded body

const port = 3000;

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
