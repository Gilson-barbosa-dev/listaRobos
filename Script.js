// Script.js para o Painel com toggle moderno de tema
let estrategiasGlobais = [];

// 🎯 Referência global da imagem e container de zoom
let zoomLevel = 1;
let isDragging = false;
let startX, startY, scrollLeft, scrollTop;
let imagemAtual = 0;
let imagensEstatisticas = [];

const imagem = document.getElementById('imagemEstatistica');
const container = document.getElementById('containerImagem');

// 🌙 Tema salvo no localStorage
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
  });

  carregarEstrategias();
});

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
      <button onclick="abrirEstatisticas(${e.magic})">📷 Estatísticas</button>
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

      const temaEscuro = document.body.classList.contains("tema-escuro");
      const corTexto = temaEscuro ? "#ffffff" : "#111111";
      const corLinha = temaEscuro ? "#00ffb3" : "#00b89c";
      const hasDados = labels.length > 0 && lucroAcumulado.some(l => l !== 0);

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
        },
        plugins: [{
          id: 'fundoPersonalizado',
          beforeDraw: (chart) => {
            const ctx = chart.canvas.getContext('2d');
            ctx.save();
            ctx.globalCompositeOperation = 'destination-over';
            ctx.fillStyle = temaEscuro ? '#0e0e0e' : '#ffffff';
            ctx.fillRect(0, 0, chart.width, chart.height);
            ctx.restore();
          }
        }]
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

// 📷 Estatísticas com imagem e zoom
function abrirEstatisticas(magic) {
  imagensEstatisticas = [
    `./img/estatisticas/${magic}_1.png`,
    `./img/estatisticas/${magic}_2.png`,
    `./img/estatisticas/${magic}_3.png`
  ];
  imagemAtual = 0;
  atualizarImagem();
  document.getElementById('tituloEstatistica').innerText = `Estatísticas: Magic ${magic}`;
  document.getElementById('modalEstatisticas').style.display = 'flex';
}

function atualizarImagem() {
  zoomLevel = 1;
  imagem.style.transform = 'scale(1)';
  imagem.src = imagensEstatisticas[imagemAtual];
  container.scrollLeft = 0;
  container.scrollTop = 0;
  container.style.overflow = 'hidden';
}

function imagemAnterior() {
  if (imagemAtual > 0) {
    imagemAtual--;
    atualizarImagem();
  }
}

function imagemProxima() {
  if (imagemAtual < imagensEstatisticas.length - 1) {
    imagemAtual++;
    atualizarImagem();
  }
}

function fecharModalEstatisticas() {
  document.getElementById('modalEstatisticas').style.display = 'none';
  imagem.src = '';
}

imagem.addEventListener('wheel', (e) => {
  e.preventDefault();
  zoomLevel += e.deltaY * -0.001;
  zoomLevel = Math.min(Math.max(zoomLevel, 1), 3);
  imagem.style.transform = `scale(${zoomLevel})`;

  if (zoomLevel > 1) {
    container.style.overflow = 'auto';
  } else {
    container.scrollLeft = 0;
    container.scrollTop = 0;
    container.style.overflow = 'hidden';
  }
});

imagem.addEventListener('mousedown', (e) => {
  if (zoomLevel === 1) return;
  isDragging = true;
  imagem.style.cursor = 'grabbing';
  startX = e.pageX;
  startY = e.pageY;
  scrollLeft = container.scrollLeft;
  scrollTop = container.scrollTop;
});

imagem.addEventListener('mouseup', () => {
  isDragging = false;
  imagem.style.cursor = 'grab';
});

imagem.addEventListener('mouseleave', () => {
  isDragging = false;
  imagem.style.cursor = 'grab';
});

imagem.addEventListener('mousemove', (e) => {
  if (!isDragging) return;
  e.preventDefault();
  const x = e.pageX;
  const y = e.pageY;
  const walkX = (x - startX);
  const walkY = (y - startY);
  container.scrollLeft = scrollLeft - walkX;
  container.scrollTop = scrollTop - walkY;
});

function zoomIn() {
  zoomLevel = Math.min(zoomLevel + 0.2, 3);
  imagem.style.transform = `scale(${zoomLevel})`;
  container.style.overflow = zoomLevel > 1 ? 'auto' : 'hidden';
}

function zoomOut() {
  zoomLevel = Math.max(zoomLevel - 0.2, 1);
  imagem.style.transform = `scale(${zoomLevel})`;
  container.style.overflow = zoomLevel > 1 ? 'auto' : 'hidden';
}

function resetZoom() {
  zoomLevel = 1;
  imagem.style.transform = 'scale(1)';
  container.scrollLeft = 0;
  container.scrollTop = 0;
  container.style.overflow = 'hidden';
}
