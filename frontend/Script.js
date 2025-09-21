// Script.js

let estrategiasGlobais = [];

// ==========================
// 🔹 Carregar dados do backend
// ==========================
async function carregarEstrategias() {
  try {
    const res = await fetch("/api/estrategias");
    if (!res.ok) throw new Error("Erro ao buscar estratégias");

    estrategiasGlobais = await res.json();
    console.log("✅ Estratégias recebidas:", estrategiasGlobais);

    aplicarFiltros(); // já aplica filtros/ordenação ao carregar
  } catch (err) {
    console.error("❌ Erro ao carregar estratégias:", err);
  }
}

// ==========================
// 🔹 Filtros e renderização
// ==========================
function aplicarFiltros() {
  const busca = document.querySelector('input[type="text"]').value.toLowerCase();
  const ordenarPor = document.querySelector("select").value;

  let filtradas = estrategiasGlobais.filter((e) => {
    const magic = String(e.magic || "").toLowerCase();
    const ativo = String(e.ativo || "").toLowerCase();
    return magic.includes(busca) || ativo.includes(busca);
  });

  filtradas.sort((a, b) => {
    if (ordenarPor === "lucro_total") return b.lucro_total - a.lucro_total;
    if (ordenarPor === "assertividade") return b.assertividade - a.assertividade;
    if (ordenarPor === "operacoes") return b.total_operacoes - a.total_operacoes;
    return 0;
  });

  renderizarEstrategias(filtradas);
}

// ==========================
// 🔹 Renderizar cards + KPIs
// ==========================
function renderizarEstrategias(estrategias) {
  let vencedoras = 0,
    perdedoras = 0,
    totalTrades = 0,
    lucroTotal = 0;

  const painel = document.getElementById("painel");
  painel.innerHTML = "";

  if (!estrategias || estrategias.length === 0) {
    painel.innerHTML = `
      <div class="bg-gray-800 text-gray-300 rounded-xl p-6 shadow-md">
        Nenhuma estratégia encontrada 🚫
      </div>
    `;
    document.getElementById("kpi-vencedoras").textContent = 0;
    document.getElementById("kpi-perdedoras").textContent = 0;
    document.getElementById("kpi-trades").textContent = 0;
    document.getElementById("kpi-lucro").textContent = "0.00";
    document.getElementById("kpi-fator-lucro").textContent = 0;
    return;
  }

  estrategias.forEach((e) => {
    const trades = e.total_operacoes || 0;
    const lucro = Number(e.lucro_total) || 0;

    totalTrades += trades;
    lucroTotal += lucro;
    if (lucro > 0) vencedoras++;
    else perdedoras++;

    const card = document.createElement("div");
    card.className =
      "bg-gray-900 border border-gray-800 rounded-2xl shadow-md p-5 flex flex-col justify-between hover:scale-105 transform transition";

    card.innerHTML = `
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-2">
          <i data-lucide="layers" class="w-4 h-4 text-blue-400"></i>
          <h2 class="text-md font-bold text-blue-400">Magic ${e.magic}</h2>
        </div>
        <span class="text-sm text-gray-400">${e.ativo}</span>
      </div>

      <dl class="space-y-1 text-sm text-gray-300">
        <div class="flex justify-between"><dt>Lucro Total</dt>
          <dd class="font-bold ${lucro >= 0 ? "text-emerald-400" : "text-red-400"}">
            ${lucro.toFixed(2)} USD
          </dd>
        </div>
        <div class="flex justify-between"><dt>Trades</dt><dd>${trades}</dd></div>
        <div class="flex justify-between"><dt>Assertividade</dt><dd class="text-blue-400">${e.assertividade || 0}%</dd></div>
      </dl>

      <div class="flex justify-between items-center mt-4 pt-3 border-t border-gray-800 text-sm">
        <button 
          class="btn-historico flex items-center gap-1 text-gray-400 hover:text-white"
          data-magic="${e.magic}">
          <i data-lucide="clock" class="w-4 h-4"></i> Histórico
        </button>
        <button class="flex items-center gap-1 text-gray-400 hover:text-white">
          <i data-lucide="bar-chart-2" class="w-4 h-4"></i> Estatística
        </button>
        <button class="flex items-center gap-1 text-gray-400 hover:text-white">
          <i data-lucide="download" class="w-4 h-4"></i> Download
        </button>
      </div>
    `;

    painel.appendChild(card);
  });

  const fatorLucro = perdedoras > 0 ? (vencedoras / perdedoras).toFixed(2) : vencedoras;
  document.getElementById("kpi-vencedoras").textContent = vencedoras;
  document.getElementById("kpi-perdedoras").textContent = perdedoras;
  document.getElementById("kpi-trades").textContent = totalTrades;
  document.getElementById("kpi-lucro").textContent = lucroTotal.toFixed(2);
  document.getElementById("kpi-fator-lucro").textContent = fatorLucro;

  lucide.createIcons();
}

// ==========================
// 🔹 Gráfico consolidado diário
// ==========================
async function carregarGraficoDiario() {
  try {
    const res = await fetch("/api/consolidado-diario");
    if (!res.ok) throw new Error("Erro ao buscar consolidado diário");

    let dados = await res.json();
    dados = dados.sort((a, b) => new Date(a.dia) - new Date(b.dia));

    const labels = dados.map((d) => new Date(d.dia).toLocaleDateString("pt-BR"));
    let acumulado = 0;
    const valores = dados.map((d) => (acumulado += parseFloat(d.lucro_total)));

    const ctx = document.getElementById("graficoDiario").getContext("2d");
    new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Evolução Acumulada",
            data: valores,
            borderColor: "#3b82f6",
            backgroundColor: "rgba(59,130,246,0.2)",
            borderWidth: 2,
            tension: 0.3,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: "#9ca3af" } },
          y: { ticks: { color: "#9ca3af" }, position: "right", beginAtZero: true },
        },
      },
    });
  } catch (err) {
    console.error("Erro ao carregar gráfico diário:", err);
  }
}

// ==========================
// 🔹 Modal Histórico
// ==========================
async function abrirHistorico(magic) {
  try {
    console.log("🟢 Abrindo modal do Magic:", magic);

    const res = await fetch(`/api/estatistica-detalhada?magic=${magic}`);
    if (!res.ok) throw new Error("Erro ao buscar histórico da estratégia");

    let dados = await res.json();
    if (!dados || dados.length === 0) {
      alert("Nenhum dado encontrado para este Magic.");
      return;
    }

    dados = dados.sort((a, b) => new Date(a.data_ordem) - new Date(b.data_ordem));

    const labels = dados.map((d) => new Date(d.data_ordem).toLocaleDateString("pt-BR"));
    let acumulado = 0;
    const valores = dados.map((d) => {
      acumulado += parseFloat(d.lucro);
      return acumulado;
    });

    // Abrir modal
    const modal = document.getElementById("modalHistorico");
    modal.classList.remove("hidden");
    modal.classList.add("flex");

    const container = modal.querySelector(".grafico-container");
    container.innerHTML = ""; // limpa o conteúdo

    const novoCanvas = document.createElement("canvas");
    novoCanvas.id = "graficoHistorico";
    novoCanvas.height = 200;
    container.appendChild(novoCanvas);

    const ctx = novoCanvas.getContext("2d");

    if (window.graficoHistoricoInstancia) {
      window.graficoHistoricoInstancia.destroy();
    }

    window.graficoHistoricoInstancia = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: `Histórico Magic ${magic}`,
            data: valores,
            borderColor: "#3b82f6",
            backgroundColor: "rgba(59,130,246,0.15)",
            borderWidth: 2,
            tension: 0.3,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: "#9ca3af" } },
          y: { ticks: { color: "#9ca3af" }, beginAtZero: true },
        },
      },
    });
  } catch (err) {
    console.error("❌ Erro ao carregar histórico da estratégia:", err);
    alert("Erro ao carregar gráfico. Veja o console.");
  }
}

function fecharModalHistorico() {
  const modal = document.getElementById("modalHistorico");
  if (!modal) return;

  modal.classList.add("hidden");
  modal.classList.remove("flex");

  if (window.graficoHistoricoInstancia) {
    window.graficoHistoricoInstancia.destroy();
    window.graficoHistoricoInstancia = null;
  }
}

// ==========================
// 🔹 Inicialização
// ==========================
document.addEventListener("DOMContentLoaded", () => {
  carregarEstrategias();
  carregarGraficoDiario();

  document.querySelector('input[type="text"]').addEventListener("input", aplicarFiltros);
  document.querySelector("select").addEventListener("change", aplicarFiltros);

  document.addEventListener("click", (e) => {
    if (e.target.closest(".btn-historico")) {
      const magic = e.target.closest(".btn-historico").dataset.magic;
      abrirHistorico(magic);
    }
  });
});
