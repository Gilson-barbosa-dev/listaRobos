// Script.js para o Painel com toggle moderno de tema e carregamento da API
let estrategiasGlobais = [];

// Ao carregar a página
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
  });

  carregarEstrategias();
});

async function carregarEstrategias() {
  try {
    const resposta = await fetch('https://apirobos-production.up.railway.app/dados');
    const dados = await resposta.json();
    estrategiasGlobais = dados;
    renderizarCards(dados);
  } catch (erro) {
    console.error('Erro ao buscar dados da API:', erro);
  }
}

function renderizarCards(estrategias) {
  const painel = document.getElementById("painel");
  painel.innerHTML = "";
  estrategias.forEach(estrategia => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <h3>${estrategia.estrategia}</h3>
      <p><strong>Ativo:</strong> ${estrategia.ativo}</p>
      <p><strong>Lucro:</strong> $${estrategia.lucro_total.toFixed(2)}</p>
      <p><strong>Operações:</strong> ${estrategia.total_operacoes}</p>
      <p><strong>Assertividade:</strong> ${estrategia.assertividade.toFixed(2)}%</p>
      <p><strong>Ret/DD:</strong> ${calcRetDD(estrategia).toFixed(2)}</p>
      <button onclick="abrirGrafico(${estrategia.magic}, '${estrategia.estrategia}')">📊 Ver gráfico</button>
    `;
    painel.appendChild(card);
  });
}

function calcRetDD(estrategia) {
  // Exemplo: lucro dividido por drawdown simulado
  return estrategia.lucro_total / (estrategia.lucro_total / (estrategia.assertividade / 100) + 1);
}

async function abrirGrafico(magic, nome) {
  const modal = document.getElementById("modalGrafico");
  const titulo = document.getElementById("tituloGrafico");
  const canvas = document.getElementById("graficoEstrategia");

  titulo.innerText = `Gráfico da Estratégia: Magic ${magic}`;
  modal.style.display = "flex";

  try {
    const resposta = await fetch(`https://apirobos-production.up.railway.app/historico/${magic}`);
    const historico = await resposta.json();

    const labels = historico.map(d => d.data_ordem);
    const lucros = historico.map(d => d.lucro);

    new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Lucro por Ordem',
          data: lucros,
          borderWidth: 2,
          fill: false
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
  } catch (erro) {
    console.error('Erro ao carregar gráfico:', erro);
  }

  document.getElementById("fecharModal").onclick = () => {
    modal.style.display = "none";
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
  };
}
