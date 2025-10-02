import express from 'express';
import request from 'supertest';
import llmRouter from './llm';

const app = express();
app.use(express.json());
app.use('/llm', llmRouter);

describe('POST /llm/generate', () => {
  it('should return 400 if prompt is missing', async () => {
    const res = await request(app)
      .post('/llm/generate')
      .send({ model: 'gpt-4o' });
    expect(res.status).toBe(400);
    expect(res.body.errors[0].msg).toBe('Prompt must be a non-empty string.');
  });

  it('should return 500 if prompt is provided but services are not mocked', async () => {
    // This will fail because the test doesn't mock the services
    // but it will at least check the validation
    const res = await request(app)
      .post('/llm/generate')
      .send({ prompt: 'Hello' });
    expect(res.status).toBe(500);
  });
});
