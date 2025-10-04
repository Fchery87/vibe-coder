import path from 'path';
import express from 'express';
import cors from 'cors';
import llmRouter from './routes/llm';
import previewRouter from './routes/preview';

// Load environment variables from root .env.local
require('dotenv').config({ path: path.resolve(process.cwd(), '../.env.local') });

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
