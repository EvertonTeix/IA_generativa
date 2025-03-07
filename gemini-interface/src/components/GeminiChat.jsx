import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function GeminiChat() {
  const [input, setInput] = useState("");
  const [response, setResponse] = useState("");
  const [history, setHistory] = useState([]);
  const [temperature, setTemperature] = useState(0.7); // Valor padrão para temperatura (0 a 1)
  const [topP, setTopP] = useState(0.9); // Valor padrão para top-p (0 a 1)
  const [topK, setTopK] = useState(40); // Valor padrão para top-k (1 a 100)
  const navigate = useNavigate();

  const token = localStorage.getItem("token");

  // Buscar o histórico ao carregar o componente
  useEffect(() => {
    axios
      .get("http://localhost:5000/chat/history", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setHistory(res.data))
      .catch((err) => console.error("Erro ao carregar histórico:", err));
  }, [token]);

  const sendMessage = async () => {
    try {
      const apiKey = import.meta.env.VITE_API_KEY;
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

      const res = await axios.post(url, {
        contents: [{ role: "user", parts: [{ text: input }] }],
        generationConfig: {
          temperature: temperature, // Adiciona a temperatura
          topP: topP, // Adiciona o top-p
          topK: topK, // Adiciona o top-k
        },
      });

      const reply = res.data.candidates[0].content.parts[0].text;
      setResponse(reply);

      // Salvar no histórico
      await axios.post(
        "http://localhost:5000/chat/save",
        { message: input, response: reply },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Atualizar o histórico após enviar uma nova mensagem
      const historyRes = await axios.get("http://localhost:5000/chat/history", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setHistory(historyRes.data);
    } catch (error) {
      console.error("Erro:", error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-2xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Chat com Gemini</h1>
          <button
            onClick={handleLogout}
            className="bg-red-500 text-white p-2 rounded hover:bg-red-600"
          >
            Logout
          </button>
        </div>
        <div className="space-y-4">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Digite sua mensagem..."
            className="w-full p-2 border border-gray-300 rounded"
          />
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Temperatura: {temperature.toFixed(2)}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full"
              />
              <p className="text-xs text-gray-500">
                Controla a criatividade (0 = determinístico, 1 = criativo).
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Top-p: {topP.toFixed(2)}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={topP}
                onChange={(e) => setTopP(parseFloat(e.target.value))}
                className="w-full"
              />
              <p className="text-xs text-gray-500">
                Controla a diversidade (0 = conservador, 1 = diverso).
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Top-k: {topK}
              </label>
              <input
                type="range"
                min="1"
                max="100"
                step="1"
                value={topK}
                onChange={(e) => setTopK(parseInt(e.target.value))}
                className="w-full"
              />
              <p className="text-xs text-gray-500">
                Limita o número de opções consideradas (1 = restrito, 100 = amplo).
              </p>
            </div>
          </div>
          <button
            onClick={sendMessage}
            className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
          >
            Enviar
          </button>
        </div>
        <div className="mt-6">
          <h2 className="text-xl font-bold mb-4">Resposta:</h2>
          <p>{response}</p>
        </div>
        <div className="mt-6">
          <h2 className="text-xl font-bold mb-4">Histórico:</h2>
          {history.length > 0 ? (
            history.map((item, index) => (
              <div key={index} className="mb-4">
                <p><strong>Você:</strong> {item.message}</p>
                <p><strong>Gemini:</strong> {item.response}</p>
                <p><small>{new Date(item.timestamp).toLocaleString()}</small></p>
              </div>
            ))
          ) : (
            <p>Nenhuma mensagem no histórico.</p>
          )}
        </div>
      </div>
    </div>
  );
}