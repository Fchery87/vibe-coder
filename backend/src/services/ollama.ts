import OpenAI from 'openai';
import { ModelConfig } from '../types/models';

export class OllamaService {
  private openai: OpenAI;

  constructor(baseURL?: string) {
    const defaultURL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1';
    this.openai = new OpenAI({
      baseURL: baseURL || defaultURL,
      apiKey: 'ollama', // Not used but required by OpenAI client
    });
  }

  async generateCode(prompt: string, model?: string) {
    try {
      const completion = await this.openai.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: model || 'llama2',
      });

      return completion.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('Ollama generation error:', error);
      throw new Error(`Ollama API error: ${error}`);
    }
  }

  async generateWithModel(prompt: string, modelConfig: ModelConfig): Promise<string> {
    // Use the model name from config, or default to llama2
    const modelName = modelConfig.name.toLowerCase().replace(/\s+/g, '') || 'llama2';
    return this.generateCode(prompt, modelName);
  }

  getAvailableModels(): string[] {
    // Return default models since we can't async here
    // Models are checked at runtime when generating
    return ['llama2', 'codellama', 'mistral'];
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch('http://localhost:11434/api/tags');
      return response.ok;
    } catch {
      return false;
    }
  }
}