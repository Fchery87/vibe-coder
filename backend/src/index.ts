// Load environment variables from root .env.local FIRST
import path from 'path';
require('dotenv').config({ path: path.resolve(process.cwd(), '../.env.local') });

// Verify environment variables are loaded for all providers
console.log('[dotenv] Environment variables loaded');
console.log('[dotenv] OPENAI_API_KEY loaded:', process.env.OPENAI_API_KEY ? 'YES' : 'NO');
console.log('[dotenv] OPENAI_API_KEY length:', process.env.OPENAI_API_KEY?.length || 0);
console.log('[dotenv] GOOGLE_API_KEY loaded:', process.env.GOOGLE_API_KEY ? 'YES' : 'NO');
console.log('[dotenv] GOOGLE_API_KEY length:', process.env.GOOGLE_API_KEY?.length || 0);
console.log('[dotenv] ANTHROPIC_API_KEY loaded:', process.env.ANTHROPIC_API_KEY ? 'YES' : 'NO');
console.log('[dotenv] ANTHROPIC_API_KEY length:', process.env.ANTHROPIC_API_KEY?.length || 0);
console.log('[dotenv] XAI_API_KEY loaded:', process.env.XAI_API_KEY ? 'YES' : 'NO');
console.log('[dotenv] XAI_API_KEY length:', process.env.XAI_API_KEY?.length || 0);
console.log('[dotenv] SUPERNOVA_API_KEY loaded:', process.env.SUPERNOVA_API_KEY ? 'YES' : 'NO');
console.log('[dotenv] SUPERNOVA_API_KEY length:', process.env.SUPERNOVA_API_KEY?.length || 0);

import express from 'express';
import cors from 'cors';
import llmRouter from './routes/llm';
import previewRouter from './routes/preview';

const app = express();
const port = 3001;

app.use(cors({
  origin: ['http://localhost:3000', 'https://vibe-coder.vercel.app']
}));
app.use(express.json());
app.use((req, res, next) => {
  console.log(`[request] ${req.method} ${req.originalUrl}`);
  next();
});
app.use('/llm', llmRouter);
app.use('/preview', previewRouter);

app.get('/', (req, res) => {
  console.log('[handler] GET /');
  res.send('Hello from the orchestrator backend!');
});

app.listen(port, () => {
  console.log(`Backend server listening at http://localhost:${port}`);
});
"" 
