import { ModelConfig } from '../types/models';

export class XAIService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.XAI_API_KEY || '';
    this.baseUrl = 'https://api.x.ai/v1';
  }

  async generateCode(prompt: string, model: string = 'grok-1'): Promise<string> {
    if (!this.apiKey) {
      throw new Error('XAI_API_KEY environment variable is not set');
    }

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: 'system',
              content: 'You are Grok, a helpful and maximally truthful AI built by xAI. You are helpful, truthful, and you do not shy away from politically incorrect claims if they are substantiated.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 4096,
          temperature: 0.7
        })
      });

      let data: any;
      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new Error(`xAI API error: ${response.status} ${response.statusText}${errText ? ` - ${errText}` : ''}`);
      } else {
        data = await response.json();
      }
      return data.choices?.[0]?.message?.content || '';
    } catch (error) {
      console.error('xAI service error:', error);
      throw error;
    }
  }

  async generateWithModel(prompt: string, modelConfig: ModelConfig): Promise<string> {
    // Map model names to xAI API model names
    const modelMap: { [key: string]: string } = {
      'grok-1': 'grok-1',
      'grok-1.5': 'grok-1.5',
      'grok-code-fast-1': 'grok-code-fast-1' // Use the correct model name as shown in xAI console
    };
    const apiModel = modelMap[modelConfig.name.toLowerCase()] || 'grok-1';
    return this.generateCode(prompt, apiModel);
  }

  getAvailableModels(): string[] {
    return ['grok-1', 'grok-1.5', 'grok-code-fast-1'];
  }
}
