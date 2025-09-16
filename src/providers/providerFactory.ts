import { LLMProvider } from '../core/types';
import { OpenAIProvider } from './openaiProvider';
import { MockProvider } from './mockProvider';

export function createProvider(providerName?: string): LLMProvider {
    const name = providerName || process.env.LLM_PROVIDER || 'openai';

    switch (name.toLowerCase()) {
        case 'openai':
            if (!process.env.OPENAI_API_KEY) {
                console.warn('OPENAI_API_KEY is not set, falling back to mock provider');
                return new MockProvider();
            }
            return new OpenAIProvider(process.env.OPENAI_API_KEY);
        case 'mock':
            return new MockProvider();
        // Add other providers here
        // case 'anthropic':
        //     return new AnthropicProvider(process.env.ANTHROPIC_API_KEY);
        default:
            console.warn(`Unknown LLM_PROVIDER "${name}", falling back to mock provider`);
            return new MockProvider();
    }
}
