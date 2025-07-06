// Painel base em React com listagem de estratégias, filtro, ordenação, tema e gráfico
import { useEffect, useState } from "react";
import Chart from "chart.js/auto";

export default function App() {
  const [estrategias, setEstrategias] = useState([]);
  const [filtradas, setFiltradas] = useState([]);
  const [ordenar, setOrdenar] = useState("lucro_total");
  const [tema, setTema] = useState(localStorage.getItem("tema") || "tema-escuro");
  const [filtro, setFiltro] = useState("");
  const [graficoData, setGraficoData] = useState(null);

  useEffect(() => {
    document.body.classList.remove("tema-claro", "tema-escuro");
    document.body.classList.add(tema);
    localStorage.setItem("tema", tema);
  }, [tema]);

  useEffect(() => {
    async function carregar() {
      try {
        const resposta = await fetch("https://apirobos-production.up.railway.app/dados");
        const dados = await resposta.json();
        setEstrategias(dados);
      } catch (e) {
        console.error("Erro ao carregar estratégias", e);
      }
    }
    carregar();
  }, []);

  useEffect(() => {
    const resultado = estrategias.filter(e =>
      e.magic.toString().includes(filtro.toLowerCase()) ||
      e.ativo.toLowerCase().includes(filtro.toLowerCase())
    );

    const ordenado = [...resultado].sort((a, b) => {
      if (ordenar === "assertividade") return b.assertividade - a.assertividade;
      if (ordenar === "operacoes") return b.total_operacoes - a.total_operacoes;
      return b.lucro_total - a.lucro_total;
    });

    setFiltradas(ordenado);
  }, [estrategias, filtro, ordenar]);

  async function abrirGrafico(magic) {
    try {
      const resposta = await fetch(`https://apirobos-production.up.railway.app/historico_detalhado/${magic}`);
      const data = await resposta.json();

      const labels = [];
      const lucroAcumulado = [];
      let acumulado = 0;
      for (const item of data) {
        const lucro = parseFloat(item.lucro_total);
        acumulado += lucro;
        labels.push(item.data);
        lucroAcumulado.push(acumulado);
      }

      setGraficoData({ labels, lucroAcumulado, magic });

      setTimeout(() => {
        const ctx = document.getElementById("graficoCanvas");
        if (!ctx) return;
        new Chart(ctx, {
          type: "line",
          data: {
            labels,
            datasets: [
              {
                label: "Lucro Acumulado",
                data: lucroAcumulado,
                borderColor: "#00b89c",
                fill: false,
                tension: 0.3
              }
            ]
          },
          options: {
            plugins: {
              legend: { labels: { color: tema === "tema-escuro" ? "#fff" : "#000" } }
            },
            scales: {
              x: { ticks: { color: tema === "tema-escuro" ? "#fff" : "#000" } },
              y: { ticks: { color: tema === "tema-escuro" ? "#fff" : "#000" } }
            }
          }
        });
      }, 100);
    } catch (e) {
      alert("Erro ao carregar gráfico.");
    }
  }

  return (
    <div className="min-h-screen px-4 py-6 bg-gray-100 dark:bg-black text-gray-900 dark:text-white">
      <h1 className="text-2xl font-bold text-center mb-6">Painel de Estratégias</h1>

      <div className="flex flex-col md:flex-row justify-center gap-4 items-center mb-6">
        <input
          type="text"
          placeholder="🔍 Magic ou Ativo..."
          value={filtro}
          onChange={e => setFiltro(e.target.value)}
          className="px-4 py-2 rounded border max-w-md w-full text-black"
        />
        <select
          value={ordenar}
          onChange={e => setOrdenar(e.target.value)}
          className="px-4 py-2 rounded border text-black"
        >
          <option value="lucro_total">📈 Lucro Total</option>
          <option value="assertividade">✅ Assertividade</option>
          <option value="operacoes">📊 Operações</option>
        </select>
        <button onClick={() => setTema(tema === "tema-escuro" ? "tema-claro" : "tema-escuro")}
          className="px-4 py-2 border rounded">
          {tema === "tema-escuro" ? "🌙" : "☀️"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtradas.map(e => (
          <div key={e.magic} className="rounded shadow p-4 bg-white dark:bg-gray-800">
            <h2 className="text-lg font-semibold mb-2">🧠 Magic: {e.magic}</h2>
            <p>📊 Ativo: {e.ativo}</p>
            <p>✅ Operações: {e.total_operacoes}</p>
            <p>✅ Vencedoras: {e.vencedoras}</p>
            <p>❌ Perdedoras: {e.perdedoras}</p>
            <p>🎯 Assertividade: {e.assertividade.toFixed(2)}%</p>
            <p>💰 Lucro Total: {e.lucro_total.toFixed(2)}</p>
            <button onClick={() => abrirGrafico(e.magic)} className="mt-2 bg-teal-500 text-white px-3 py-1 rounded">📊 Ver Gráfico</button>
          </div>
        ))}
      </div>

      {graficoData && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 p-4 rounded relative max-w-xl w-full">
            <button onClick={() => setGraficoData(null)} className="absolute top-2 right-2 text-xl">&times;</button>
            <h2 className="text-xl font-bold mb-2">Histórico: Magic {graficoData.magic}</h2>
            <canvas id="graficoCanvas"></canvas>
          </div>
        </div>
      )}
    </div>

    // Aqui
  );
}
