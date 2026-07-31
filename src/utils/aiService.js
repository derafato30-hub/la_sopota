import { GoogleGenerativeAI } from "@google/generative-ai";

// TODO: Configura tu API Key en un archivo .env como VITE_GEMINI_API_KEY
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "TU_GEMINI_API_KEY"; 

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

/**
 * Función que envía el historial de ventas a Gemini y retorna una propuesta de menú.
 * @param {Array} historialVentas - Array de objetos con datos estadísticos de ventas.
 * @returns {string} - Propuesta de menú formateada en Markdown.
 */
export const generarPropuestaMenuIA = async (historialVentas) => {
  if (GEMINI_API_KEY === "TU_GEMINI_API_KEY") {
    throw new Error("API Key de Gemini no configurada. Edita src/utils/aiService.js para agregarla.");
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    const prompt = `
      Eres un experto analista gastronómico y gerente de restaurante de comida hondureña para el local "La Sopota".
      A continuación, te proporciono un resumen de ventas recientes y popularidad de acompañantes:
      ${JSON.stringify(historialVentas)}

      Basado en estos datos empíricos, tu tarea es proponer el "Menú del Día" ideal para el día de mañana, maximizando la rentabilidad y la satisfacción del cliente.
      
      Debes incluir:
      1. Dos opciones de carnes principales.
      2. Tres opciones de acompañantes que la gente haya demostrado que ama.
      3. Una opción de sopa (considerando hace cuánto no se hace una sopa popular).
      4. Una breve explicación de POR QUÉ elegiste esa combinación basada en los datos.

      Formatea la respuesta en un Markdown claro y muy elegante.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Error al generar propuesta con IA:", error);
    throw error;
  }
};
