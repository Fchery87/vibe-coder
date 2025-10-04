import { LLMProvider } from './provider-manager';
import { ModelConfig } from '../types/models';

export class GoogleService implements LLMProvider {
  private apiKey: string;
  private apiBaseUrl: string;

  constructor() {
    this.apiKey = process.env.GOOGLE_API_KEY || '';
    this.apiBaseUrl = 'https://generativelanguage.googleapis.com/v1beta';

    if (!this.apiKey) {
      throw new Error('GOOGLE_API_KEY environment variable is required');
    }
  }

  async generateCode(prompt: string, model?: string): Promise<string> {
    const modelName = model || 'gemini-2.5-pro';

    const response = await fetch(`${this.apiBaseUrl}/models/${modelName}:generateContent?key=${this.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048
        }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google AI API error: ${response.status} ${error}`);
    }

    const data = await response.json();

    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('No response generated from Google AI');
    }

    return data.candidates[0].content.parts[0].text;
  }

  async generateWithModel(prompt: string, modelConfig: ModelConfig): Promise<string> {
    // Extract model name from the model config name (e.g., "Gemini 2.5 Pro" -> "gemini-2.5-pro")
    const modelName = modelConfig.name.toLowerCase()
      .replace(/gemini /, 'gemini-')
      .replace(/ /g, '-');

    return this.generateCode(prompt, modelName);
  }

  getAvailableModels(): string[] {
    return [
      'gemini-2.5-pro',
      'gemini-2.5-flash',
      'gemini-2.5-flash-lite'
    ];
  }
}
