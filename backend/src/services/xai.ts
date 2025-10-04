import { ModelConfig } from '../types/models';

export class XAIService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.XAI_API_KEY || '';
    this.baseUrl = 'https://api.x.ai/v1';

    // Debug logging for API key loading
    console.log('[xai] API Key loaded:', this.apiKey ? 'YES' : 'NO');
    console.log('[xai] API Key length:', this.apiKey.length);
    if (this.apiKey) {
      console.log('[xai] API Key starts with:', this.apiKey.substring(0, 10) + '...');
    }
  }

  async generateCode(prompt: string, model: string = 'grok-4-fast-reasoning'): Promise<string> {
    console.log('[xai] generateCode called with model:', model, 'prompt length:', prompt.length);

    if (!this.apiKey) {
      console.log('[xai] ERROR: XAI_API_KEY is not set!');
      throw new Error('XAI_API_KEY environment variable is not set');
    }

    console.log('[xai] API key is available, making request to xAI API');

    try {
      const response = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 4096,
          temperature: 0.7
        })
      });

      console.log('[xai] Response status:', response.status);

      const data = await response.json();

      if (data.error) {
        console.log('[xai] API error:', data.error);
        throw new Error(`xAI API error: ${data.error}`);
      }

      if (!response.ok) {
        throw new Error(`xAI API error: ${response.status} ${response.statusText}`);
      }

      const content = data.choices?.[0]?.message?.content;
      console.log('[xai] Generated content length:', content?.length || 0);

      return content || '';

    } catch (error) {
      console.error('[xai] Request failed:', error);
      throw error;
    }
  }

  async generateWithModel(prompt: string, modelConfig: ModelConfig): Promise<string> {
    // Map model names to xAI API model names
    const modelMap: { [key: string]: string } = {
      'grok-4-fast-reasoning': 'grok-4-fast-reasoning',
      'grok-4-fast-non-reasoning': 'grok-4-fast-non-reasoning',
      'grok-4-0709': 'grok-4-0709',
      'grok-code-fast-1': 'grok-code-fast-1',
      'grok-3': 'grok-3',
      'grok-3-mini': 'grok-3-mini',
      'grok-2-vision-1212us-east-1': 'grok-2-vision-1212us-east-1',
      'grok-2-vision-1212eu-west-1': 'grok-2-vision-1212eu-west-1'
    };
    const apiModel = modelMap[modelConfig.name.toLowerCase()] || 'grok-4-fast-reasoning';
    return this.generateCode(prompt, apiModel);
  }

  getAvailableModels(): string[] {
    return [
      'grok-4-fast-reasoning',
      'grok-4-fast-non-reasoning',
      'grok-4-0709',
      'grok-code-fast-1',
      'grok-3',
      'grok-3-mini',
      'grok-2-vision-1212us-east-1',
      'grok-2-vision-1212eu-west-1'
    ];
  }
}
"" 
