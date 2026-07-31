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

const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`;
fetch(url)
  .then(res => res.json())
  .then(data => {
     const textModels = data.models.filter(m => m.supportedGenerationMethods.includes('generateContent'));
     console.log(textModels.map(m => m.name));
  })
  .catch(err => console.error(err));
