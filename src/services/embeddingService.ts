import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export class EmbeddingService {
    private static instance: EmbeddingService;
    private modelName: string = 'text-embedding-ada-002';
    private useMockEmbeddings: boolean;
    private mockDimension: number = 1536;

    private constructor() {
        this.useMockEmbeddings = process.env.USE_MOCK_EMBEDDINGS === 'true';
    }

    public static getInstance(): EmbeddingService {
        if (!EmbeddingService.instance) {
            EmbeddingService.instance = new EmbeddingService();
        }
        return EmbeddingService.instance;
    }

    private generateMockEmbedding(text: string): number[] {
        // Create a deterministic but seemingly random embedding based on the text
        const embedding = new Array(this.mockDimension).fill(0);
        let sum = 0;
        
        // Use text characters to generate pseudo-random values
        for (let i = 0; i < text.length; i++) {
            const charCode = text.charCodeAt(i);
            const position = i % this.mockDimension;
            embedding[position] = (charCode * 0.01) % 1;
            sum += embedding[position];
        }

        // Normalize the embedding
        const magnitude = Math.sqrt(embedding.reduce((acc, val) => acc + val * val, 0));
        return embedding.map(val => val / (magnitude || 1));
    }

    public async generateEmbedding(text: string): Promise<number[]> {
        if (this.useMockEmbeddings) {
            return this.generateMockEmbedding(text);
        }

        try {
            const response = await openai.embeddings.create({
                model: this.modelName,
                input: text.replace(/\n/g, ' '),
            });

            return response.data[0].embedding;
        } catch (error) {
            console.error('Error generating embedding:', error);
            throw error;
        }
    }

    public async generateEmbeddings(texts: string[]): Promise<number[][]> {
        try {
            const embeddings = await Promise.all(
                texts.map(text => this.generateEmbedding(text))
            );
            return embeddings;
        } catch (error) {
            console.error('Error generating embeddings:', error);
            throw error;
        }
    }
}
