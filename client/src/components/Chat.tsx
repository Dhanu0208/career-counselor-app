import { useState } from "react";
import axios from "axios";

export default function Chat() {
  const [messages, setMessages] = useState<string[]>([]);
  const [input, setInput] = useState("");

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMessage = `You: ${input}`;
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    const res = await axios.post("http://localhost:5000/chat", {
      message: input,
    });

    const botMessage = `AI: ${res.data.response}`;
    setMessages((prev) => [...prev, botMessage]);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="bg-white rounded-xl shadow-md p-6 h-[400px] overflow-y-auto space-y-2">
        {messages.map((msg, i) => (
          <div key={i} className="text-sm">
            {msg}
          </div>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <input
          className="flex-grow border px-4 py-2 rounded-lg"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button
          onClick={sendMessage}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg"
        >
          Send
        </button>
      </div>
    </div>
  );
}
