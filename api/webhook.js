import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

const TELEGRAM_TOKEN = process.env.TOKEN_API;
const HF_API_KEY = process.env.HF_API_KEY;
const HF_MODEL = "bigscience/bloomz-7b1";
const HF_URL = `https://api-inference.huggingface.co/models/${HF_MODEL}`;

export default async function handler(req, res) {
  // Быстрый тест в браузере
  if (req.method === "GET") {
    return res.status(200).send("Webhook endpoint is alive");
  }

  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  if (!TELEGRAM_TOKEN || !HF_API_KEY) {
    console.error("Missing env vars:", { TELEGRAM_TOKEN: !!TELEGRAM_TOKEN, HF_API_KEY: !!HF_API_KEY });
    return res.status(500).send("Server misconfiguration");
  }

  const msg = req.body?.message;
  if (!msg || !msg.text) {
    return res.status(200).send("No message");
  }

  const chatId = msg.chat?.id;
  if (!chatId) {
    console.error("No chat id in message", msg);
    return res.status(400).send("No chat id");
  }

  try {
    const hfResp = await axios.post(
      HF_URL,
      { inputs: msg.text },
      {
        headers: {
          Authorization: `Bearer ${HF_API_KEY}`,
          "Content-Type": "application/json"
        },
        timeout: 20000
      }
    );

    const answer =
      hfResp.data?.[0]?.generated_text ||
      hfResp.data?.generated_text ||
      (typeof hfResp.data === "string" ? hfResp.data : null) ||
      "Нет ответа 😔";

    await axios.post(
      `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`,
      {
        chat_id: chatId,
        text: answer
      },
      { timeout: 10000 }
    );

    return res.status(200).send("OK");
  } catch (err) {
    console.error("Handler error:", err.response?.data || err.message || err);
    // Попытка уведомить пользователя об ошибке, но не критично если это тоже упадёт
    try {
      await axios.post(
        `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`,
        {
          chat_id: chatId,
          text: "Ошибка при запросе к AI 😔"
        },
        { timeout: 8000 }
      );
    } catch (sendErr) {
      console.error("Failed to notify user:", sendErr.message || sendErr);
    }
    return res.status(500).send("Error");
  }
}