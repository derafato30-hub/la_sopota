import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from 'fs';

const envConfig = fs.readFileSync('.env', 'utf-8')
  .split('\n')
  .filter(line => line.trim() && !line.startsWith('#'))
  .reduce((acc, line) => {
    const [key, ...val] = line.split('=');
    acc[key.trim()] = val.join('=').trim().replace(/(^'|'$|^"|"$)/g, '');
    return acc;
  }, {});

const GEMINI_API_KEY = envConfig['VITE_GEMINI_API_KEY'];

if (!GEMINI_API_KEY) {
  console.log("NO API KEY FOUND in .env");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

async function testModel(modelName) {
  try {
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent("Say hello");
    console.log(`✅ ${modelName} works: ${result.response.text().substring(0, 15)}...`);
    return true;
  } catch (error) {
    console.log(`❌ ${modelName} failed: ${error.message.substring(0, 100)}...`);
    return false;
  }
}

async function runTests() {
  await testModel("gemini-1.5-flash");
  await testModel("gemini-1.5-flash-latest");
  await testModel("gemini-pro");
  await testModel("gemini-1.5-pro");
}

runTests();
