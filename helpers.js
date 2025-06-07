const axios = require("axios");
const { HttpsProxyAgent } = require("https-proxy-agent");

async function getMyIp() {
  const res = await axios.get("https://api.ipify.org?format=json");
  return res.data.ip;
}

async function testProxy(proxyUrl, myIp) {
  try {
    const agent = new HttpsProxyAgent(proxyUrl);
    const response = await axios.get("https://httpbin.org/get", {
      httpsAgent: agent,
      httpAgent: agent,
      timeout: 8000,
      headers: { Accept: "application/json" },
    });

    const proxyIp = response.data.origin;
    const headers = response.data.headers;

    console.log("Tu IP real:", myIp);
    console.log("IP que muestra el proxy (origin):", proxyIp);
    console.log("Headers devueltos por el proxy:\n", headers);

    // Verificar si tu IP aparece en el origin
    if (proxyIp.includes(myIp)) {
      return false;
    }

    // Revisar headers sospechosos
    const lowerHeaders = Object.fromEntries(
      Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v])
    );

    const leakedHeaders = ["x-forwarded-for", "forwarded", "via", "client-ip"];
    for (const key of leakedHeaders) {
      if (lowerHeaders[key] && lowerHeaders[key].includes(myIp)) {
        console.log(`⚠️  IP real filtrada en header: ${key}`);
        return false;
      }
    }

    // Si no aparece en origin ni en headers, es anónimo
    return true;
  } catch (e) {
    console.error("Error al probar el proxy:", e.message);
    return false;
  }
}

(async () => {
  const proxy = "http://201.150.116.3:999";
  const myIp = await getMyIp();
  const isAnonymous = await testProxy(proxy, myIp);
  console.log("¿Proxy anónimo?", isAnonymous);
})();
