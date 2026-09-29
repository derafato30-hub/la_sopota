import { GoogleGenerativeAI } from "@google/generative-ai";

// TODO: Configura tu API Key en un archivo .env como VITE_GEMINI_API_KEY
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "TU_GEMINI_API_KEY"; 

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

/**
 * Función que envía el historial de ventas a Gemini y retorna una propuesta de menú.
 */
export const generarPropuestaMenuIA = async (historialVentas) => {
  if (GEMINI_API_KEY === "TU_GEMINI_API_KEY") {
    throw new Error("API Key de Gemini no configurada. Edita src/utils/aiService.js para agregarla.");
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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

/**
 * Función para extraer pedidos del Club de Cadetes a partir de una imagen (manuscrita o excel).
 */
export const extraerPedidosClub = async (base64Image, mimeType, menuDisponibles) => {
  if (GEMINI_API_KEY === "TU_GEMINI_API_KEY") {
    throw new Error("API Key de Gemini no configurada.");
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      Analiza la imagen adjunta. Es una lista de pedidos de comida de cadetes (puede estar escrita a mano o ser un excel).
      Necesito que extraigas una lista estricta en formato JSON.
      
      Reglas:
      1. "cadetName": Intenta extraer Apellidos y Nombres.
      2. "year": Debe ser ESTRICTAMENTE uno de estos valores: "I año", "II año", "III año", "IV año" o "Extra".
      3. "dishName": Relaciona lo que el usuario pidió con uno de los siguientes platos disponibles (si no se parece a ninguno, déjalo como lo leíste o pon "Desconocido"). Platos disponibles: ${menuDisponibles.map(m => m.name).join(', ')}.
      
      SOLO DEBES RESPONDER CON UN ARREGLO JSON CRUDO. SIN MARKDOWN. SIN \`\`\`json. SOLO EL ARREGLO EMPEZANDO CON [ y TERMINANDO CON ].
      
      Ejemplo de salida esperada:
      [
        {"cadetName": "PEREZ JUAN", "year": "II año", "dishName": "Pollo Frito"},
        {"cadetName": "GARCIA MARIA", "year": "III año", "dishName": "Chuleta"}
      ]
    `;

    const imagePart = {
      inlineData: {
        data: base64Image,
        mimeType: mimeType
      }
    };

    const result = await model.generateContent([prompt, imagePart]);
    const text = result.response.text().trim();
    
    // Limpieza agresiva por si la IA devuelve markdown a pesar de las instrucciones
    const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    return JSON.parse(cleanedText);
  } catch (error) {
    console.error("Error al procesar imagen con IA:", error);
    throw error;
  }
};
