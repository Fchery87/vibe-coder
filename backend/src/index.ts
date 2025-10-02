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
app.use('/llm', llmRouter);
app.use('/preview', previewRouter);

app.get('/', (req, res) => {
  res.send('Hello from the orchestrator backend!');
});

app.listen(port, () => {
  console.log(`Backend server listening at http://localhost:${port}`);
});
