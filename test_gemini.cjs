require('dotenv').config({path: '.env.local'});
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');

async function test() {
  const GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY;
  console.log("Key:", GEMINI_API_KEY);
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  try {
    const prompt = "Contesta con la palabra HOLA si me entiendes.";
    const result = await model.generateContent(prompt);
    console.log("Respuesta:", result.response.text());
  } catch(e) {
    console.error("Error:", e.message);
  }
}
test();
