// Script.js

let estrategiasGlobais = [];

// ==========================
// 🔹 Favoritos (Banco via API)
// ==========================
async function toggleFavorito(magic) {
  try {
    const btn = document.querySelector(`.btn-favorito[data-magic="${magic}"]`);
    const icon = btn?.querySelector("i, svg");

    const jaFavorito = icon?.classList.contains("text-yellow-400");

    if (jaFavorito) {
      // Remove do banco
      await fetch(`/api/favoritos/${magic}`, { method: "DELETE" });

      // Atualiza estilo (estrela apagada)
      if (icon) {
        icon.classList.remove(
          "text-yellow-400",
          "drop-shadow-glow",
          "fill-yellow-400"
        );
        icon.classList.add("text-gray-500", "fill-transparent");
      }
    } else {
      // Adiciona no banco
      await fetch(`/api/favoritos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ magic }),
      });

      // Atualiza estilo (estrela acesa)
      if (icon) {
        icon.classList.remove("text-gray-500", "fill-transparent");
        icon.classList.add(
          "text-yellow-400",
          "drop-shadow-glow",
          "fill-yellow-400",
          "animate-pulse-star"
        );
        setTimeout(() => {
          icon.classList.remove("animate-pulse-star");
        }, 500);
      }
    }

    lucide.createIcons();

    // Atualiza gráficos/listas apenas se estiver na aba de favoritos
    if (window.location.pathname.includes("meus-algoritmos")) {
      carregarFavoritos();
      carregarGraficoFavoritos();
    }
  } catch (err) {
    console.error("❌ Erro ao alternar favorito:", err);
  }
}

// ==========================
// 🔹 Carregar dados do backend
// ==========================
async function carregarEstrategias() {
  try {
    // Busca todas as estratégias
    const res = await fetch("/api/estrategias");
    if (!res.ok) throw new Error("Erro ao buscar estratégias");
    estrategiasGlobais = await res.json();

    // Busca favoritos atuais do banco
    const respFav = await fetch("/api/favoritos");
    const favoritos = respFav.ok ? await respFav.json() : [];
    const listaMagicsFav = favoritos.map((f) => String(f.magic));

    // Marca os que são favoritos
    estrategiasGlobais = estrategiasGlobais.map((e) => ({
      ...e,
      isFavorito: listaMagicsFav.includes(String(e.magic)),
    }));

    aplicarFiltros();
  } catch (err) {
    console.error("❌ Erro ao carregar estratégias:", err);
  }
}

// ==========================
// 🔹 Filtros (Página principal)
// ==========================
function aplicarFiltros() {
  const busca =
    document.querySelector('input[type="text"]')?.value?.toLowerCase() || "";
  const ordenarPor = document.querySelector("select")?.value || "lucro_total";

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
// 🔹 Renderizar cards (Página Principal)
// ==========================
function renderizarEstrategias(estrategias) {
  const painel = document.getElementById("painel");
  if (!painel) return;

  let vencedoras = 0,
    perdedoras = 0,
    totalTrades = 0,
    lucroTotal = 0;
  painel.innerHTML = "";

  if (!estrategias || estrategias.length === 0) {
    painel.innerHTML = `<div class="bg-gray-800 text-gray-300 rounded-xl p-6 shadow-md">
      Nenhuma estratégia encontrada 🚫
    </div>`;
    atualizarKPIs("kpi", {
      vencedoras: 0,
      perdedoras: 0,
      trades: 0,
      lucro: 0,
      fator: 0,
    });
    return;
  }

  estrategias.forEach((e) => {
    const trades = e.total_operacoes || 0;
    const lucro = Number(e.lucro_total) || 0;

    totalTrades += trades;
    lucroTotal += lucro;
    lucro > 0 ? vencedoras++ : perdedoras++;

    const card = criarCardEstrategia(e, false);
    painel.appendChild(card);
  });

  const fatorLucro =
    perdedoras > 0 ? (vencedoras / perdedoras).toFixed(2) : vencedoras;
  atualizarKPIs("kpi", {
    vencedoras,
    perdedoras,
    trades: totalTrades,
    lucro: lucroTotal,
    fator: fatorLucro,
  });
  lucide.createIcons();
}

// ==========================
// 🔹 Renderizar Favoritos (Meus Algoritmos)
// ==========================
async function carregarFavoritos() {
  try {
    // 🔹 Garante que as estratégias estão carregadas antes
    if (!estrategiasGlobais || estrategiasGlobais.length === 0) {
      console.warn("⚠️ Estratégias ainda não carregadas, aguardando...");
      await carregarEstrategias();
    }

    // 🔹 Busca favoritos
    const resp = await fetch("/api/favoritos");
    if (!resp.ok) throw new Error("Erro ao buscar favoritos");
    const favoritos = await resp.json();

    console.log("🟢 Favoritos recebidos:", favoritos);

    if (!favoritos || favoritos.length === 0) {
      const painel = document.getElementById("painel-favoritos");
      painel.innerHTML = `<div class="bg-gray-800 text-gray-300 rounded-xl p-6 shadow-md">
        Nenhum algoritmo favoritado ⭐
      </div>`;
      atualizarKPIs("fav", {
        vencedoras: 0,
        perdedoras: 0,
        trades: 0,
        lucro: 0,
        fator: 0,
      });
      const elCapital = document.getElementById("fav-capital-total");
      if (elCapital) elCapital.textContent = "$0.00";
      return;
    }

    // 🔹 Extrai apenas os magics únicos
    const listaMagics = [...new Set(favoritos.map(f => String(f.magic)))];
    const listaFavoritos = listaMagics.map(magic => ({ magic }));

    console.log("✅ Lista processada de favoritos:", listaFavoritos);

    // 🔹 Renderiza os cards
    renderizarEstrategiasFavoritos(listaFavoritos);
  } catch (err) {
    console.error("❌ Erro ao carregar favoritos:", err);
    const painel = document.getElementById("painel-favoritos");
    if (painel) {
      painel.innerHTML = `<div class="bg-gray-800 text-gray-300 rounded-xl p-6 shadow-md">
        Erro ao carregar favoritos ⚠️
      </div>`;
    }
  }
}

function renderizarEstrategiasFavoritos(listaFavoritos) {
  const painel = document.getElementById("painel-favoritos");
  if (!painel) return;

  console.log("🟣 Estratégias globais carregadas:", estrategiasGlobais.length);
  console.log("🟣 Favoritos recebidos para renderizar:", listaFavoritos);

  let vencedoras = 0,
    perdedoras = 0,
    totalTrades = 0,
    lucroTotal = 0,
    capitalTotal = 0;

  painel.innerHTML = "";

  if (!listaFavoritos || listaFavoritos.length === 0) {
    painel.innerHTML = `<div class="bg-gray-800 text-gray-300 rounded-xl p-6 shadow-md">
      Nenhum algoritmo favoritado ⭐
    </div>`;

    try {
      atualizarKPIs("fav", {
        vencedoras: 0,
        perdedoras: 0,
        trades: 0,
        lucro: 0,
        fator: 0,
      });
    } catch (e) {
      console.warn("⚠️ Erro ao atualizar KPIs (nenhum KPI encontrado)", e);
    }

    const elCapital = document.getElementById("fav-capital-total");
    if (elCapital) elCapital.textContent = "$0.00";
    return;
  }

  // 🔹 Renderiza cada estratégia favorita
  listaFavoritos.forEach((fav) => {
    const estrategia = estrategiasGlobais.find(
      (e) => String(e.magic) === String(fav.magic)
    );
    if (!estrategia) {
      console.warn("⚠️ Estratégia não encontrada para magic:", fav.magic);
      return;
    }

    const trades = estrategia.total_operacoes || 0;
    const lucro = Number(estrategia.lucro_total) || 0;
    totalTrades += trades;
    lucroTotal += lucro;
    lucro > 0 ? vencedoras++ : perdedoras++;

    if (estrategia.capital_minimo)
      capitalTotal += parseFloat(estrategia.capital_minimo);

    const card = criarCardEstrategia({ ...estrategia, isFavorito: true }, true);
    painel.appendChild(card);
  });

  // 🔹 Atualiza os KPIs com segurança
  try {
    const fatorLucro = perdedoras > 0 ? (vencedoras / perdedoras).toFixed(2) : vencedoras;
    atualizarKPIs("fav", {
      vencedoras,
      perdedoras,
      trades: totalTrades,
      lucro: lucroTotal,
      fator: fatorLucro,
    });
  } catch (err) {
    console.warn("⚠️ Erro ao atualizar KPIs:", err);
  }

  // 🔹 Atualiza o capital total do portfólio
  const elCapital = document.getElementById("fav-capital-total");
  if (elCapital) {
    elCapital.textContent = capitalTotal.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
    });
  } else {
    console.warn("⚠️ Elemento #fav-capital-total não encontrado no DOM.");
  }

  lucide.createIcons();
}

// ==========================
// 🔹 Criar Card
// ==========================
function criarCardEstrategia(e, isFavorito) {
  const card = document.createElement("div");
  card.className =
    "bg-gray-900 border border-gray-800 rounded-2xl shadow-md p-5 flex flex-col justify-between hover:scale-105 transform transition";

  card.innerHTML = `
    <div class="flex items-center justify-between mb-2">
      <div class="flex items-center gap-2">
        <i data-lucide="layers" class="w-4 h-4 text-blue-400"></i>
        <h2 class="text-md font-bold text-blue-400">Magic ${e.magic}</h2>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-sm text-gray-400">${e.ativo}</span>
        <button class="btn-favorito ml-2 p-1 rounded transition transform hover:scale-110" data-magic="${e.magic}">
          <i data-lucide="star"
             class="w-6 h-6 transition duration-300 ${
               e.isFavorito
                 ? "text-yellow-400 drop-shadow-glow fill-yellow-400"
                 : "text-gray-500 fill-transparent"
             }"></i>
        </button>
      </div>
    </div>

    <dl class="space-y-1 text-sm text-gray-300">
      <div class="flex justify-between"><dt>Lucro Total</dt>
        <dd class="font-bold ${
          e.lucro_total >= 0 ? "text-emerald-400" : "text-red-400"
        }">
          ${Number(e.lucro_total).toFixed(2)} USD
        </dd>
      </div>
      <div class="flex justify-between"><dt>Trades</dt><dd>${
        e.total_operacoes || 0
      }</dd></div>
      <div class="flex justify-between"><dt>Assertividade</dt><dd class="text-blue-400">${
        e.assertividade || 0
      }%</dd></div>
    </dl>

    <div class="flex justify-between items-center mt-4 pt-3 border-t border-gray-800 text-sm">
      <button class="btn-historico flex items-center gap-1 text-gray-400 hover:text-white" data-magic="${
        e.magic
      }">
        <i data-lucide="clock" class="w-4 h-4"></i> Histórico
      </button>
      <button class="btn-estatistica flex items-center gap-1 text-gray-400 hover:text-white" 
        data-magic="${e.magic}"
        data-arquivo="${e.arquivo}">
        <i data-lucide="bar-chart-2" class="w-4 h-4"></i> Estatística
      </button>
      <button class="btn-download flex items-center gap-1 text-gray-400 hover:text-white" data-magic="${e.magic}">
        <i data-lucide="download" class="w-4 h-4"></i> Download
      </button>
    </div>
  `;

  return card;
}

// ==========================
// 🔹 Baixar EA
// ==========================
async function baixarEA(magic) {
  try {
    const res = await fetch(`/api/arquivos/${magic}`);
    if (!res.ok) throw new Error("Erro ao buscar link do EA");

    const { url } = await res.json();

    // Força o download
    const a = document.createElement("a");
    a.href = url;
    a.download = `Strategy-${magic}.ex5`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (err) {
    console.error("❌ Erro no download:", err);
    alert("Erro ao baixar o arquivo.");
  }
}

// ==========================
// 🔹 Atualizar KPIs
// ==========================
function atualizarKPIs(prefixo, { vencedoras, perdedoras, trades, lucro, fator }) {
  const elVenc = document.getElementById(`${prefixo}-vencedoras`);
  const elPerd = document.getElementById(`${prefixo}-perdedoras`);
  const elTrades = document.getElementById(`${prefixo}-trades`);
  const elLucro = document.getElementById(`${prefixo}-lucro`);
  const elCapital = document.getElementById(`${prefixo}-capital-total`);
  const elFator = document.getElementById(`${prefixo}-fator-lucro`);

  if (elVenc) elVenc.textContent = vencedoras ?? 0;
  if (elPerd) elPerd.textContent = perdedoras ?? 0;
  if (elTrades) elTrades.textContent = trades ?? 0;

  // ✅ Formato americano ($4,619.32)
  const formatarMoeda = (valor) =>
    `$${Number(valor || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  if (elLucro) elLucro.textContent = formatarMoeda(lucro);
  if (elCapital) elCapital.textContent = formatarMoeda(fator);

  // Mantém fator para outros contextos
  if (elFator && prefixo !== "fav") elFator.textContent = fator ?? 0;
}

// Formata o valor
function formatarMoeda(valor) {
  return valor.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });
}


// ==========================
// 🔹 Gráficos
// ==========================
async function carregarGraficoDiario() {
  try {
    const res = await fetch("/api/consolidado-diario");
    if (!res.ok) throw new Error("Erro ao buscar consolidado diário");

    let dados = await res.json();
    dados = dados.sort((a, b) => new Date(a.dia) - new Date(b.dia));

    const labels = dados.map((d) =>
      new Date(d.dia).toLocaleDateString("pt-BR")
    );
    let acumulado = 0;
    const valores = dados.map((d) => (acumulado += parseFloat(d.lucro_total)));

    const ctx = document.getElementById("graficoDiario")?.getContext("2d");
    if (!ctx) return;

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
          y: {
            ticks: { color: "#9ca3af" },
            position: "right",
            beginAtZero: true,
          },
        },
      },
    });
  } catch (err) {
    console.error("Erro ao carregar gráfico diário:", err);
  }
}

let graficoFavoritosInstancia = null;

async function carregarGraficoFavoritos() {
  try {
    const res = await fetch("/api/favoritos");
    if (!res.ok) throw new Error("Erro ao buscar favoritos");
    const favoritos = await res.json();

    if (!favoritos.length) return;

    const params = favoritos
      .map((m) => "magic=" + encodeURIComponent(m.magic))
      .join("&");
    const resp = await fetch("/api/estatistica-detalhada?" + params);
    if (!resp.ok) throw new Error("Erro ao buscar dados dos favoritos");

    let dados = await resp.json();

    const mapa = {};
    dados.forEach((d) => {
      const dia = new Date(d.data_ordem).toISOString().split("T")[0];
      mapa[dia] = (mapa[dia] || 0) + parseFloat(d.lucro);
    });

    const labels = Object.keys(mapa).sort(
      (a, b) => new Date(a) - new Date(b)
    );
    let acumulado = 0;
    const valores = labels.map((dia) => (acumulado += mapa[dia]));

    const ctx = document.getElementById("graficoFavoritos")?.getContext("2d");
    if (!ctx) return;

    if (graficoFavoritosInstancia) graficoFavoritosInstancia.destroy();

    graficoFavoritosInstancia = new Chart(ctx, {
      type: "line",
      data: {
        labels: labels.map((d) =>
          new Date(d).toLocaleDateString("pt-BR")
        ),
        datasets: [
          {
            label: "Evolução dos Favoritos",
            data: valores,
            borderColor: "#facc15",
            backgroundColor: "rgba(250, 204, 21, 0.2)",
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
          y: {
            ticks: { color: "#9ca3af" },
            position: "right",
            beginAtZero: true,
          },
        },
      },
    });
  } catch (err) {
    console.error("❌ Erro ao carregar gráfico dos favoritos:", err);
  }
}

// ==========================
// 🔹 Modal Histórico
// ==========================
async function abrirHistorico(magic) {
  try {
    const res = await fetch(`/api/estatistica-detalhada?magic=${magic}`);
    if (!res.ok) throw new Error("Erro ao buscar histórico da estratégia");

    let dados = await res.json();
    if (!dados || dados.length === 0) {
      alert("Nenhum dado encontrado para este Magic.");
      return;
    }

    dados = dados.sort((a, b) => new Date(a.data_ordem) - new Date(b.data_ordem));

    const labels = dados.map((d) =>
      new Date(d.data_ordem).toLocaleDateString("pt-BR")
    );
    let acumulado = 0;
    const valores = dados.map((d) => (acumulado += parseFloat(d.lucro)));

    const modal = document.getElementById("modalHistorico");
    modal.classList.remove("hidden");
    modal.classList.add("flex");

    const container = modal.querySelector(".grafico-container");
    container.innerHTML = "";

    const novoCanvas = document.createElement("canvas");
    novoCanvas.id = "graficoHistorico";
    novoCanvas.height = 200;
    container.appendChild(novoCanvas);

    const ctx = novoCanvas.getContext("2d");
    if (window.graficoHistoricoInstancia)
      window.graficoHistoricoInstancia.destroy();

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
          y: {
            ticks: { color: "#9ca3af" },
            position: "right",
            beginAtZero: true,
          },
        },
      },
    });
  } catch (err) {
    console.error("❌ Erro ao carregar histórico da estratégia:", err);
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
// 🔹 Modal Estatística
// ==========================

async function abrirEstatistica(magic) {
  try {
    console.log("📊 Abrindo estatística do Magic:", magic);

    // 🔹 Busca a imagem da métrica
    const res = await fetch(`/api/metricas/${magic}`);
    if (!res.ok) throw new Error("Erro ao buscar imagem da métrica");
    const { url } = await res.json();

    // 🔹 Busca dados da estratégia atual em cache
    const estrategia = estrategiasGlobais.find(
      (e) => String(e.magic) === String(magic)
    );

    // 🔹 Atualiza título e imagem
    document.getElementById("tituloEstatistica").textContent =
      `Estatísticas da Estratégia`;
    document.getElementById("imagemEstatistica").src = url || "";

    // 🔹 Atualiza blocos de informações
    document.getElementById("infoMagic").textContent = estrategia?.magic || "---";
    document.getElementById("infoTipo").textContent =
      estrategia?.tipo_estrategia || "Não informado";
    document.getElementById("infoTimeframe").textContent =
      estrategia?.timeframe || "—";

    // 🔹 Formata capital mínimo com símbolo de dólar e duas casas decimais
    if (estrategia?.capital_minimo != null && estrategia?.capital_minimo !== "") {
      const capital = parseFloat(estrategia.capital_minimo).toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
      });
      document.getElementById("infoCapital").textContent = capital;
    } else {
      document.getElementById("infoCapital").textContent = "—";
    }

    // 🔹 Exibe o modal
    const modal = document.getElementById("modalEstatistica");
    modal.classList.remove("hidden");
    modal.classList.add("flex");

    lucide.createIcons();
  } catch (err) {
    console.error("❌ Erro ao abrir estatística:", err);
    alert("Erro ao abrir estatística. Veja o console.");
  }
}


function fecharModalEstatistica() {
  const modal = document.getElementById("modalEstatistica");
  if (!modal) return;

  modal.classList.add("hidden");
  modal.classList.remove("flex");

  const img = document.getElementById("imagemEstatistica");
  img.src = "";
}

function fecharModalEstatistica() {
  const modal = document.getElementById("modalEstatistica");
  if (!modal) return;

  modal.classList.add("hidden");
  modal.classList.remove("flex");

  const img = document.getElementById("imagemEstatistica");
  img.src = "";
}

// ==========================
// 🔹 Inicialização
// ==========================
document.addEventListener("DOMContentLoaded", async () => {
  await carregarEstrategias();
  carregarGraficoDiario();

  if (window.location.pathname.includes("meus-algoritmos")) {
    carregarFavoritos();
    carregarGraficoFavoritos();
  }

  document
    .querySelector('input[type="text"]')
    ?.addEventListener("input", aplicarFiltros);
  document
    .querySelector("select")
    ?.addEventListener("change", aplicarFiltros);

  document.addEventListener("click", (e) => {
    if (e.target.closest(".btn-historico")) {
      e.stopImmediatePropagation();
      const magic = e.target.closest(".btn-historico").dataset.magic;
      abrirHistorico(magic);
    }
    if (e.target.closest(".btn-favorito")) {
      e.stopImmediatePropagation();
      const magic = e.target.closest(".btn-favorito").dataset.magic;
      toggleFavorito(magic);
    }
    if (e.target.closest(".btn-download")) {
      const magic = e.target.closest(".btn-download").dataset.magic;
      baixarEA(magic);
    }
    if (e.target.closest(".btn-estatistica")) {
      e.stopImmediatePropagation();
      const btn = e.target.closest(".btn-estatistica");
      const magic = btn.dataset.magic;
      const arquivo = btn.dataset.arquivo;
      abrirEstatistica(magic, arquivo);
    }
  });
});
