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
      console.log('[xai] sending request', {
        model,
        promptLength: prompt.length
      });

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);

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
        }),
        signal: controller.signal
      });

      clearTimeout(timeout);

      const data = await response.json();

      // Check for xAI API errors in the response body
      if (data.error) {
        throw new Error(`xAI API error: ${data.error}${data.code ? ` (${data.code})` : ''}`);
      }

      if (!response.ok) {
        const errText = JSON.stringify(data);
        throw new Error(`xAI API error: ${response.status} ${response.statusText}${errText ? ` - ${errText}` : ''}`);
      }

      console.log('[xai] received response', {
        hasChoices: Array.isArray(data.choices),
        firstChoiceLength: data.choices?.[0]?.message?.content?.length || 0
      });
      return data.choices?.[0]?.message?.content || '';
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('xAI service timeout reached');
        throw new Error('xAI request timed out');
      }
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
"" 
