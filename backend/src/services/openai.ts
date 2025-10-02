import OpenAI from 'openai';
import { ModelConfig } from '../types/models';

export class OpenAIService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async generateCode(prompt: string, model?: string) {
    const completion = await this.openai.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: model || 'gpt-4o', // GPT-5 Codex equivalent
    });

    return completion.choices[0]?.message?.content || '';
  }

  async generateWithModel(prompt: string, modelConfig: ModelConfig): Promise<string> {
    const modelName = modelConfig.name.toLowerCase().includes('gpt')
      ? modelConfig.name.toLowerCase()
      : 'gpt-4o';
    return this.generateCode(prompt, modelName);
  }

  getAvailableModels(): string[] {
    return ['gpt-4o', 'gpt-4'];
  }
}
