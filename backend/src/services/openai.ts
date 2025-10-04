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
    const modelName = model || 'gpt-4o';

    console.log('[openai] generateCode called with model:', modelName);
    console.log('[openai] API key is available, making request to OpenAI API');
    console.log('[openai] Prompt length:', prompt.length);

    try {
      const completion = await this.openai.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: modelName,
        max_tokens: 2048,
        temperature: 0.7
      });

      console.log('[openai] Request successful, response received');
      return completion.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('[openai] API request failed:', error);
      throw error;
    }
  }

  async generateWithModel(prompt: string, modelConfig: ModelConfig): Promise<string> {
    const modelName = modelConfig.name.toLowerCase().includes('gpt')
      ? modelConfig.name.toLowerCase()
      : 'gpt-4o';
    return this.generateCode(prompt, modelName);
  }

  getAvailableModels(): string[] {
    return ['gpt-4o', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'];
  }
}
