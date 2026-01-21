import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const msg = req.body.message;
  if (!msg || !msg.text) {
    return res.status(200).send("No message");
  }

  const TELEGRAM_TOKEN = process.env.TOKEN_API;
  const HF_MODEL = "bigscience/bloomz-7b1"; // ✅ поддерживает узбекский
  const HF_URL = `https://router.huggingface.co/${HF_MODEL}`;

  try {
    const response = await axios.post(
      HF_URL,
      { inputs: msg.text },
      {
        headers: {
          Authorization: `Bearer ${process.env.HF_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const answer =
      response.data[0]?.generated_text ||
      response.data.generated_text ||
      "Нет ответа 😔";

    await axios.post(
      `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`,
      {
        chat_id: msg.chat.id,
        text: answer
      }
    );

    res.status(200).send("OK");
  } catch (err) {
    console.error("Ошибка HuggingFace:", err.response?.data || err.message);
    await axios.post(
      `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`,
      {
        chat_id: msg.chat.id,
        text: "Ошибка при запросе к AI 😔"
      }
    );
    res.status(500).send("Error");
  }
}