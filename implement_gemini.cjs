const fs = require('fs');
let f = fs.readFileSync('src/pages/Finanzas.jsx', 'utf8');

// Add import if missing
if (!f.includes('GoogleGenerativeAI')) {
  f = f.replace(/import \{ toast \} from 'sonner';/, "import { toast } from 'sonner';\nimport { GoogleGenerativeAI } from '@google/generative-ai';");
}

const oldFunc = `  const handleNlpAnalyze = async () => {
    if (!nlpText) return;
    setNlpLoading(true);
    // Simular el llamado a Gemini
    setTimeout(() => {
      toast.success('IA: He llenado el formulario por ti.');
      setTxType('OUT');
      setAmount(3000);
      setCategory('PLANILLA');
      setDesc(nlpText);
      setSourceAcc(accounts.find(a => a.type==='CASH')?.id || '');
      setNlpLoading(false);
    }, 1500);
  };`;

const newFunc = `  const handleNlpAnalyze = async () => {
    if (!nlpText) return;
    setNlpLoading(true);
    try {
      const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash", 
        generationConfig: { responseMimeType: "application/json" } 
      });

      const accountsList = accounts.filter(a => a.type !== 'PAYABLE').map(a => ({ id: a.id, name: a.name }));
      
      const prompt = \`
      Eres un asistente contable experto. Analiza el siguiente texto de un usuario y extrae los datos de la transacción financiera.
      Devuelve ÚNICAMENTE un objeto JSON válido con esta estructura exacta:
      {
        "txType": "IN" o "OUT" o "TRANSFER",
        "amount": número,
        "category": "ID_CATEGORIA" (solo si IN o OUT),
        "desc": "Breve descripción corta del motivo",
        "sourceAccId": "ID_CUENTA" (de donde sale el dinero, null si es IN),
        "destAccId": "ID_CUENTA" (a donde entra el dinero, null si es OUT)
      }

      Cuentas disponibles: \${JSON.stringify(accountsList)}
      
      Categorías de EGRESO (OUT): INVERSION, PLANILLA, CAJA_CHICA, CUENTAS_PAGADAS, GASTO_PERSONAL, AJUSTE_NEGATIVO
      Categorías de INGRESO (IN): VENTA_POS, CLUB, COBRO_CREDITO, AJUSTE_POSITIVO

      Reglas muy estrictas:
      1. Usa inteligencia para deducir la cuenta correcta de la lista de cuentas disponibles. Por ejemplo si dice "atlantida" busca el ID de "Banco Atlántida".
      2. Si compra producto, materia prima (ej. gallinas, pollo, papas), la categoría es INVERSION.
      3. Si transfiere o pasa dinero entre cuentas, el txType es TRANSFER, category es nulo, sourceAccId es de donde sale y destAccId a donde entra.
      4. Si es un pago, el dinero SALE (OUT). Si es cobro, ENTRA (IN).

      Texto del usuario a analizar: "\${nlpText}"
      \`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const data = JSON.parse(text);

      if (data.txType) setTxType(data.txType);
      if (data.amount) setAmount(data.amount);
      if (data.category) setCategory(data.category);
      if (data.desc) setDesc(data.desc);
      if (data.sourceAccId) setSourceAcc(data.sourceAccId);
      if (data.destAccId) setDestAcc(data.destAccId);

      toast.success('✨ IA: ¡Formulario autocompletado con éxito!');
    } catch (error) {
      console.error("NLP Error:", error);
      toast.error('Error al analizar el texto con IA. Revisa tu consola.');
    }
    setNlpLoading(false);
  };`;

f = f.replace(oldFunc, newFunc);
fs.writeFileSync('src/pages/Finanzas.jsx', f, 'utf8');
console.log('Fixed NLP');
