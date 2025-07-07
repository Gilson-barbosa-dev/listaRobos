// Script.js para o Painel com toggle moderno de tema
let estrategiasGlobais = [];

document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('toggle-tema');
  const temaSalvo = localStorage.getItem("temaEscolhido") || "tema-escuro";
  document.body.classList.add(temaSalvo);
  if (toggle) toggle.checked = temaSalvo === "tema-escuro";

  if (toggle) {
    toggle.addEventListener('change', () => {
      const novoTema = toggle.checked ? "tema-escuro" : "tema-claro";
      document.body.classList.remove("tema-claro", "tema-escuro");
      document.body.classList.add(novoTema);
      localStorage.setItem("temaEscolhido", novoTema);

      if (document.getElementById("modalGrafico")?.style.display === "flex") {
        const magicAtual = document.getElementById("tituloGrafico").innerText.split("Magic ")[1];
        if (magicAtual) {
          if (window.renderizarGrafico) renderizarGrafico(magicAtual);
        }
      }
    });
  }

  carregarEstrategias();
});

async function carregarEstrategias() {
  try {
    const res = await fetch("https://apirobos-production.up.railway.app/dados");
    const estrategias = await res.json();
    estrategiasGlobais = estrategias;
    renderizarCards(estrategias);
  } catch (error) {
    console.error("Erro ao carregar estratégias:", error);
  }
}

function renderizarCards(estrategias) {
  const container = document.getElementById("cards");
  container.innerHTML = "";

  estrategias.forEach(est => {
    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <h2>${est.estrategia}</h2>
      <p><strong>Magic:</strong> ${est.magic}</p>
      <p><strong>Ativo:</strong> ${est.ativo}</p>
      <p><strong>Lucro Total:</strong> $${est.lucro_total.toFixed(2)}</p>
      <p><strong>Operações:</strong> ${est.total_operacoes}</p>
      <p><strong>Assertividade:</strong> ${est.assertividade.toFixed(2)}%</p>
      <div class="card-buttons">
        <button onclick="abrirGrafico(${est.magic}, '${est.estrategia}')">📊 Ver gráfico</button>
        <button onclick="copiarMagic(${est.magic})">🔗 Copiar Magic</button>
      </div>
    `;

    container.appendChild(card);
  });
}

function copiarMagic(magic) {
  navigator.clipboard.writeText(magic).then(() => {
    alert("Magic copiado: " + magic);
  });
}

async function abrirGrafico(magic, estrategia) {
  try {
    const res = await fetch("https://apirobos-production.up.railway.app/historico/" + magic);
    const dados = await res.json();

    const labels = dados.map(item => item.data_ordem);
    const lucros = dados.map(item => item.lucro);
    const acumulado = lucros.reduce((acc, val, i) => {
      acc.push((acc[i - 1] || 0) + val);
      return acc;
    }, []);

    const ctx = document.getElementById("graficoCanvas").getContext("2d");
    if (window.chartInstance) window.chartInstance.destroy();

    window.chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Lucro Acumulado',
          data: acumulado,
          borderWidth: 2,
          tension: 0.2,
          pointRadius: 0
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: { ticks: { display: false } }
        }
      }
    });

    document.getElementById("tituloGrafico").innerText = `Gráfico - Magic ${magic}`;
    document.getElementById("modalGrafico").style.display = "flex";
  } catch (error) {
    console.error("Erro ao abrir gráfico:", error);
  }
}

function fecharModal() {
  document.getElementById("modalGrafico").style.display = "none";
}
