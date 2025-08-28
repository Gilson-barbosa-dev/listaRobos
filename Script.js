let estrategiasGlobais = [];

document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('toggle-tema');
  const temaSalvo = localStorage.getItem("temaEscolhido") || "tema-escuro";
  document.body.classList.add(temaSalvo);
  toggle.checked = temaSalvo === "tema-escuro";

  toggle.addEventListener('change', () => {
    const novoTema = toggle.checked ? "tema-escuro" : "tema-claro";
    document.body.classList.remove("tema-claro", "tema-escuro");
    document.body.classList.add(novoTema);
    localStorage.setItem("temaEscolhido", novoTema);

    if (document.getElementById("modalGrafico")?.style.display === "flex") {
      const magicAtual = document.getElementById("tituloGrafico").innerText.split("Magic ")[1];
      if (magicAtual) {
        if (window.graficoInstancia) {
          window.graficoInstancia.destroy();
          window.graficoInstancia = null;
        }
        setTimeout(() => abrirGrafico(parseInt(magicAtual)), 50);
      }
    }
    desenharDashboardConsolidado();
  });

  carregarEstrategias();

  if (typeof ApexCharts === 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/apexcharts';
    script.onload = desenharDashboardConsolidado;
    document.head.appendChild(script);
  }
});

async function carregarEstrategias() {
  try {
    const resposta = await fetch('https://apirobos-production.up.railway.app/dados');
    const estrategias = await resposta.json();
    estrategiasGlobais = ordenarEstrategias(estrategias);
    renderizar(estrategiasGlobais);
    desenharDashboardConsolidado();
  } catch (erro) {
    console.error('Erro ao carregar estratégias:', erro);
  }
}

// DASHBOARD CONSOLIDADO
function desenharDashboardConsolidado() {
  if (!estrategiasGlobais || estrategiasGlobais.length === 0) return;

  let vencedoras = 0, perdedoras = 0, trades = 0, lucro = 0;
  let assertVencedoras = 0, assertPerdedoras = 0;
  let lucroPositivo = 0, perdaNegativa = 0, maxDrawdown = 0;
  let lucroDiario = {};

  estrategiasGlobais.forEach(e => {
    if (e.lucro_total > 0) vencedoras++; else perdedoras++;
    if (e.assertividade >= 50) assertVencedoras++; else assertPerdedoras++;
    trades += e.total_operacoes || 0;
    lucro += e.lucro_total || 0;
    if (e.lucro_total > 0) lucroPositivo += e.lucro_total;
    if (e.lucro_total < 0) perdaNegativa += Math.abs(e.lucro_total);
    if (e.max_drawdown && e.max_drawdown > maxDrawdown) maxDrawdown = e.max_drawdown;
    if (e.inicio && e.lucro_total) {
      let dia = e.inicio.split('T')[0] || e.inicio.split(' ')[0];
      if (!lucroDiario[dia]) lucroDiario[dia] = 0;
      lucroDiario[dia] += e.lucro_total;
    }
  });

  let fatorLucro = (perdaNegativa > 0) ? (lucroPositivo / perdaNegativa).toFixed(2) : '—';
  let retornoDD = (maxDrawdown > 0) ? (lucro / maxDrawdown).toFixed(2) : '—';

  // KPIs formatados
  document.getElementById('kpi-vencedoras').innerText = vencedoras;
  document.getElementById('kpi-perdedoras').innerText = perdedoras;
  document.getElementById('kpi-trades').innerText = trades;
  document.getElementById('kpi-lucro').innerText = lucro.toFixed(2);
  document.getElementById('kpi-fator-lucro').innerText = fatorLucro;
  document.getElementById('kpi-retorno-dd').innerText = retornoDD;

  const temaEscuro = document.body.classList.contains('tema-escuro');
  const corTexto = temaEscuro ? '#f8f9fa' : '#111';
  const corLinha = temaEscuro ? '#00ffb3' : '#00b89c';
  const bgGrid = temaEscuro ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

  // Gráfico de lucro diário em destaque
  const dias = Object.keys(lucroDiario).sort();
  const lucros = dias.map(d => parseFloat(lucroDiario[d].toFixed(2))); // 2 casas decimais
  if (window.chartLucroDiario) window.chartLucroDiario.destroy();
  window.chartLucroDiario = new ApexCharts(document.querySelector("#grafico-lucro-diario"), {
    chart: { type: 'area', height: 420, toolbar: { show: true }, foreColor: corTexto, fontFamily: 'Inter, sans-serif' },
    series: [{ name: 'Lucro Diário', data: lucros }],
    xaxis: { categories: dias, labels: { rotate: -45 } },
    yaxis: { labels: { formatter: val => val.toFixed(2) } },
    colors: [corLinha],
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 3 },
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.5, opacityTo: 0.05, stops: [0, 90, 100] } },
    grid: { borderColor: bgGrid },
    tooltip: { theme: temaEscuro ? 'dark' : 'light', y: { formatter: val => val.toFixed(2) } }
  });
  window.chartLucroDiario.render();

  // Apenas gráfico de assertividade continua
  if (window.chartAssertividade) window.chartAssertividade.destroy();
  window.chartAssertividade = new ApexCharts(document.querySelector("#grafico-assertividade"), {
    chart: { type: 'donut', height: 280, foreColor: corTexto, fontFamily: 'Inter, sans-serif' },
    series: [assertVencedoras, assertPerdedoras],
    labels: ['Assert. ≥ 50%', 'Assert. < 50%'],
    colors: ['#00b89c', '#ffb84d'],
    legend: { show: true, position: 'bottom', labels: { colors: corTexto } },
    tooltip: { theme: temaEscuro ? 'dark' : 'light' }
  });
  window.chartAssertividade.render();
}

// ---------------- FUNÇÕES DE SUPORTE ----------------
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
      <button onclick="abrirEstatisticas(${e.magic})">📷 Estatísticas</button>
    `;
    painel.appendChild(card);
  });
}
