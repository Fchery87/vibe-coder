import { LLMProvider } from './provider-manager';
import { ModelConfig } from '../types/models';

export class AnthropicService implements LLMProvider {
  private apiKey: string;
  private apiBaseUrl: string;

  constructor() {
    this.apiKey = process.env.ANTHROPIC_API_KEY || '';
    this.apiBaseUrl = 'https://api.anthropic.com/v1';

    if (!this.apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required');
    }
  }

  async generateCode(prompt: string, model?: string): Promise<string> {
    const modelName = model || 'claude-3-5-sonnet-20241022';

    console.log('[anthropic] generateCode called with model:', modelName);
    console.log('[anthropic] API key is available, making request to Anthropic API');
    console.log('[anthropic] Prompt length:', prompt.length);

    const response = await fetch(`${this.apiBaseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: modelName,
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${response.status} ${error}`);
    }

    const data = await response.json();
    return data.content[0].text;
  }

  async generateWithModel(prompt: string, modelConfig: ModelConfig): Promise<string> {
    // Map our internal model names to Anthropic's model names
    const modelMapping: { [key: string]: string } = {
      'claude-3-5-sonnet': 'claude-3-5-sonnet-20241022',
      'claude-3-opus': 'claude-3-opus-20240229',
      'claude-3-sonnet': 'claude-3-sonnet-20240229',
      'claude-3-haiku': 'claude-3-haiku-20240307'
    };

    const modelName = modelMapping[modelConfig.name.toLowerCase()] || 'claude-3-5-sonnet-20241022';

    const response = await fetch(`${this.apiBaseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: modelName,
        max_tokens: modelConfig.maxTokens || 4096,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${response.status} ${error}`);
    }

    const data = await response.json();
    return data.content[0].text;
  }

  getAvailableModels(): string[] {
    return [
      'claude-3-5-sonnet-20241022',
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307'
    ];
  }
}