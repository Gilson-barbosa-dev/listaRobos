// Tema toggle
function aplicarTema(tema) {
  const body = document.body;
  body.classList.remove("tema-claro", "tema-escuro");
  body.classList.add(tema);
  localStorage.setItem("temaEscolhido", tema);
  document.getElementById("toggleTema").innerText =
    tema === "tema-claro" ? "🌙 Tema Escuro" : "☀️ Tema Claro";
}

document.getElementById("toggleTema").addEventListener("click", () => {
  const temaAtual = document.body.classList.contains("tema-claro") ? "tema-claro" : "tema-escuro";
  aplicarTema(temaAtual === "tema-claro" ? "tema-escuro" : "tema-claro");

  if (document.getElementById("modalGrafico").style.display === "flex") {
    const magicAtual = document.getElementById("tituloGrafico").innerText.split("Magic ")[1];
    if (magicAtual) {
      if (window.graficoInstancia) {
        window.graficoInstancia.destroy();
        window.graficoInstancia = null;
      }
      setTimeout(() => abrirGrafico(parseInt(magicAtual)), 10);
    }
  }
});

const temaSalvo = localStorage.getItem("temaEscolhido") || "tema-escuro";
aplicarTema(temaSalvo);

let estrategiasGlobais = [];

async function carregarEstrategias() {
  const cacheKey = 'estrategias_cache';
  const cacheTimeKey = 'estrategias_cache_time';
  const cacheTime = 60000;
  const now = Date.now();
  const lastFetch = parseInt(localStorage.getItem(cacheTimeKey), 10) || 0;
  if (now - lastFetch < cacheTime) {
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey));
      if (cached) {
        estrategiasGlobais = ordenarEstrategias(cached);
        renderizar(estrategiasGlobais);
        return;
      }
    } catch (e) {}
  }
  try {
    const resposta = await fetch('https://apirobos-production.up.railway.app/dados');
    const estrategias = await resposta.json();
    localStorage.setItem(cacheKey, JSON.stringify(estrategias));
    localStorage.setItem(cacheTimeKey, now.toString());
    estrategiasGlobais = ordenarEstrategias(estrategias);
    renderizar(estrategiasGlobais);
  } catch (erro) {
    console.error('Erro ao carregar estratégias:', erro);
  }
}

function ordenarEstrategias(lista) {
  const criterio = document.getElementById('ordenar')?.value || 'lucro';
  const copia = [...lista];
  switch (criterio) {
    case 'assertividade': return copia.sort((a, b) => b.assertividade - a.assertividade);
    case 'operacoes': return copia.sort((a, b) => b.total_operacoes - a.total_operacoes);
    case 'data': return copia.sort((a, b) => new Date(a.inicio) - new Date(b.inicio));
    default: return copia.sort((a, b) => b.lucro_total - a.lucro_total);
  }
}

function formatarData(dataGMT) {
  if (!dataGMT) return '—';
  const data = new Date(dataGMT);
  return data.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false, timeZone: 'UTC'
  });
}

function renderizar(lista) {
  const painel = document.getElementById('painel');
  painel.innerHTML = '';
  lista.forEach(e => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <h2>🧠 Magic: <span>${e.magic}</span></h2>
      <div class="info-line">🕒 Início: <span>${formatarData(e.inicio)}</span></div>
      <div class="info-line">📊 Ativo: <span>${e.ativo}</span></div>
      <div class="info-line">✅ Operações: <span>${e.total_operacoes}</span></div>
      <div class="info-line">✅ Vencedoras: <span>${e.vencedoras}</span></div>
      <div class="info-line">❌ Perdedoras: <span>${e.perdedoras}</span></div>
      <div class="info-line">🎯 Assertividade: <span>${e.assertividade.toFixed(2)}%</span></div>
      <div class="info-line">💰 Lucro Total: <span>${e.lucro_total.toFixed(2)}</span></div>
      <button onclick="abrirGrafico(${e.magic})">📊 Ver Gráfico</button>
    `;
    painel.appendChild(card);
  });
}

function abrirGrafico(magic) {
  fetch(`https://apirobos-production.up.railway.app/historico_detalhado/${magic}`)
    .then(res => res.json())
    .then(data => {
      const ctx = document.getElementById('graficoLucro').getContext('2d');
      const labels = [];
      const lucroAcumulado = [];
      let acumulado = 0;

      for (const item of data) {
        let lucro = parseFloat(
          typeof item.lucro_total === "string" ? item.lucro_total.replace(",", ".") : item.lucro_total
        );
        if (isNaN(lucro)) lucro = 0;

        labels.push(item.data);
        acumulado += lucro;
        lucroAcumulado.push(acumulado);
      }

      if (window.graficoInstancia) window.graficoInstancia.destroy();

      const hasDados = labels.length > 0 && lucroAcumulado.some(l => l !== 0);
      const isClaro = document.body.classList.contains("tema-claro");
      const corTexto = isClaro ? "#111" : "#fff";
      const corLinha = isClaro ? "#00b89c" : "#00ffb3";

      window.graficoInstancia = new Chart(ctx, {
        type: 'line',
        data: {
          labels: hasDados ? labels : ["Sem dados"],
          datasets: [{
            label: hasDados ? 'Lucro Acumulado' : 'Nenhum dado encontrado',
            data: hasDados ? lucroAcumulado : [0],
            fill: false,
            borderColor: corLinha,
            tension: 0.3
          }]
        },
        options: {
          plugins: {
            legend: { labels: { color: corTexto } },
            tooltip: { callbacks: { label: ctx => `Lucro acumulado: ${ctx.raw.toFixed(2)}` } }
          },
          scales: {
            x: { ticks: { color: corTexto } },
            y: { ticks: { color: corTexto } }
          }
        }
      });

      document.getElementById('tituloGrafico').innerText = `Histórico: Magic ${magic}`;
      document.getElementById('modalGrafico').style.display = 'flex';
    })
    .catch(err => {
      console.error("Erro ao carregar gráfico:", err);
      alert("Não foi possível carregar o gráfico.");
    });
}

function fecharModal() {
  document.getElementById('modalGrafico').style.display = 'none';
}

document.getElementById('filtro').addEventListener('input', e => {
  const termo = e.target.value.toLowerCase();
  const filtradas = estrategiasGlobais.filter(e =>
    e.magic.toString().includes(termo) || (e.ativo || '').toLowerCase().includes(termo)
  );
  renderizar(ordenarEstrategias(filtradas));
});

document.getElementById('ordenar').addEventListener('change', () => {
  renderizar(ordenarEstrategias(estrategiasGlobais));
});

carregarEstrategias();
