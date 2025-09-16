import { MilvusClient, DataType } from '@zilliz/milvus2-sdk-node';
import { EmbeddingService } from '../services/embeddingService';
import { KBCategory, KBEntry, KBMetadata } from './types';

export class KnowledgeService {
    private static instance: KnowledgeService;
    private milvus: MilvusClient;
    private embeddingService: EmbeddingService;
    private readonly COLLECTION_NAME = 'kb_embeddings';
    private readonly VECTOR_DIM = 1536; // Ada-002 embedding dimension

    private constructor() {
        this.milvus = new MilvusClient({
            address: '127.0.0.1:19530',
            ssl: false,
            timeout: 30000, // 30 seconds timeout
            maxRetries: 3,  // Retry failed requests
            retryDelay: 1000 // Wait 1 second between retries
        });
        this.embeddingService = EmbeddingService.getInstance();
    }

    public static getInstance(): KnowledgeService {
        if (!KnowledgeService.instance) {
            KnowledgeService.instance = new KnowledgeService();
        }
        return KnowledgeService.instance;
    }

    public async initialize(): Promise<void> {
        try {
            console.log('Checking if collection exists...');
            // Check if collection exists
            const exists = await this.milvus.hasCollection({
                collection_name: this.COLLECTION_NAME
            });
            
            if (exists) {
                console.log('Collection exists, dropping it...');
                try {
                    await this.milvus.dropCollection({
                        collection_name: this.COLLECTION_NAME
                    });
                    // Wait for collection to be fully dropped
                    await new Promise(resolve => setTimeout(resolve, 5000));
                } catch (error) {
                    console.error('Error dropping collection:', error);
                    throw error;
                }
            }

            console.log('Creating collection with schema...');
            const fields = [
                {
                    name: 'id',
                    description: 'Primary key',
                    data_type: DataType.Int64,
                    is_primary_key: true,
                    autoID: true,
                },
                {
                    name: 'embedding',
                    description: 'Vector embedding',
                    data_type: DataType.FloatVector,
                    type_params: { dim: this.VECTOR_DIM.toString() },
                },
                {
                    name: 'content',
                    description: 'KB text content',
                    data_type: DataType.VarChar,
                    type_params: { max_length: '4096' },
                },
                {
                    name: 'category',
                    description: 'Content category',
                    data_type: DataType.VarChar,
                    type_params: { max_length: '64' },
                }
            ];

            console.log('Creating collection...');
            await this.milvus.createCollection({
                collection_name: this.COLLECTION_NAME,
                fields,
            });

            console.log('Collection created, waiting for it to be ready...');
            await new Promise(resolve => setTimeout(resolve, 5000));

            try {
                console.log('Creating index for vector similarity search...');
                // Create index for vector similarity search
                await this.milvus.createIndex({
                    collection_name: this.COLLECTION_NAME,
                    field_name: 'embedding',
                    index_type: "IVF_FLAT",
                    metric_type: "L2",
                    params: { nlist: 1024 }
                });

                console.log('Index created, waiting for it to be ready...');
                await new Promise(resolve => setTimeout(resolve, 5000));

                console.log('Loading collection into memory...');
                // Load collection into memory
                await this.milvus.loadCollection({
                    collection_name: this.COLLECTION_NAME
                });

                console.log('Collection loaded, waiting for final initialization...');
                await new Promise(resolve => setTimeout(resolve, 5000));
            } catch (error) {
                console.error('Error during index creation or collection loading:', error);
                throw error;
            }

            console.log('Knowledge base initialized successfully');
        } catch (error) {
            console.error('Error initializing knowledge base:', error);
            throw error;
        }
    }

    public async addEntry(entry: KBEntry): Promise<void> {
        try {
            const embedding = await this.embeddingService.generateEmbedding(entry.content);
            
            await this.milvus.insert({
                collection_name: this.COLLECTION_NAME,
                fields_data: [{
                    content: entry.content,
                    category: entry.metadata.category,
                    embedding,
                }],
            });
        } catch (error) {
            console.error('Error adding knowledge base entry:', error);
            throw error;
        }
    }

    public async addEntries(entries: KBEntry[]): Promise<void> {
        try {
            console.log('Generating embeddings...');
            const embeddings = await this.embeddingService.generateEmbeddings(
                entries.map(entry => entry.content)
            );

            console.log('Inserting entries...');
            const fieldsData = entries.map((entry, index) => ({
                content: entry.content,
                category: entry.metadata.category,
                embedding: embeddings[index],
            }));

            await this.milvus.insert({
                collection_name: this.COLLECTION_NAME,
                fields_data: fieldsData,
            });

            // Flush the collection to ensure data is persisted
            await this.milvus.flushSync({
                collection_names: [this.COLLECTION_NAME]
            });

            // Ensure collection is loaded
            await this.milvus.loadCollection({
                collection_name: this.COLLECTION_NAME
            });

            // Wait a bit for the collection to be fully loaded
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
            console.error('Error adding knowledge base entries:', error);
            throw error;
        }
    }

    public async findSimilarContent(
        query: string,
        options: {
            limit?: number;
            minSimilarity?: number;
            category?: KBCategory;
        } = {}
    ): Promise<Array<{
        content: string;
        metadata: KBMetadata;
        similarity: number;
    }>> {
        try {
            const {
                limit = 5,
                minSimilarity = 0.5,
                category
            } = options;

            const queryEmbedding = await this.embeddingService.generateEmbedding(query);

            // Build search expression for filtering
            const expressions: string[] = [];
            if (category) {
                expressions.push(`category == "${category}"`);
            }

            const searchRes = await this.milvus.search({
                collection_name: this.COLLECTION_NAME,
                vector: queryEmbedding,
                limit: limit,
                output_fields: ['content', 'category'],
                vector_field: 'embedding',
                metric_type: 'L2',
                ...(expressions.length > 0 && {
                    expression: expressions.join(" && ")
                })
            });

            return searchRes.results
                .map(result => ({
                    content: result.content,
                    metadata: {
                        category: result.category as KBCategory
                    },
                    similarity: 1 - result.score, // Convert L2 distance to similarity score
                }))
                .filter(result => result.similarity >= minSimilarity)
                .slice(0, limit);
        } catch (error) {
            console.error('Error searching knowledge base:', error);
            throw error;
        }
    }

    public async clearKnowledgeBase(): Promise<void> {
        try {
            await this.milvus.dropCollection({
                collection_name: this.COLLECTION_NAME,
            });
            await this.initialize();
        } catch (error) {
            console.error('Error clearing knowledge base:', error);
            throw error;
        }
    }
}
