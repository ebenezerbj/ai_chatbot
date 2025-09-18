import { MilvusClient, DataType, InsertReq, DeleteReq } from '@zilliz/milvus2-sdk-node';

const milvus = new MilvusClient({
  address: process.env.MILVUS_ADDRESS || 'localhost:19530',
});

const COLLECTION_NAME = process.env.MILVUS_KB_COLLECTION || 'kb_embeddings';
const VECTOR_DIM = Number(process.env.EMBEDDING_DIM || 768); // Adjust based on your embedding model

async function createKBCollection() {
  // Define schema: id, embedding vector, and optional metadata
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
      type_params: { dim: VECTOR_DIM.toString() },
    },
    {
      name: 'content',
      description: 'KB text content',
      data_type: DataType.VarChar,
      type_params: { max_length: '1024' },
    },
    {
      name: 'kb_id',
      description: 'KB entry id (as string)',
      data_type: DataType.VarChar,
      type_params: { max_length: '64' },
    },
  ];

  // Create collection
  const res = await milvus.createCollection({
    collection_name: COLLECTION_NAME,
    fields,
  });

  // Create index for vector field
  await milvus.createIndex({
    collection_name: COLLECTION_NAME,
    field_name: 'embedding',
    params: {
      index_type: "IVF_FLAT",
      metric_type: "L2",
      params: JSON.stringify({ nlist: 1024 })
    }
  });

  // Load collection into memory
  await milvus.loadCollection({
    collection_name: COLLECTION_NAME,
  });

  console.log('Collection creation result:', res);
}

interface KBEntry {
  content: string;
  embedding: number[];
}

async function insertKBEntries(entries: KBEntry[]): Promise<void> {
  const insertData: InsertReq = {
    collection_name: COLLECTION_NAME,
    fields_data: entries.map(entry => ({
      content: entry.content,
      kb_id: (entry as any).kb_id,
      embedding: entry.embedding,
    })),
  };

  const res = await milvus.insert(insertData);
  console.log('Inserted entries successfully');
}

async function upsertKBEntry(kbId: string, content: string, embedding: number[]): Promise<void> {
  // Delete existing entries with same kb_id (safe upsert)
  try {
  await milvus.delete({ collection_name: COLLECTION_NAME, filter: `kb_id == "${kbId}"` } as any);
  } catch (e) {
    // ignore if delete fails (e.g., none exist)
  }

  const insertData: InsertReq = {
    collection_name: COLLECTION_NAME,
    fields_data: [
      {
        content,
        kb_id: kbId,
        embedding,
      },
    ],
  };

  await milvus.insert(insertData);
  // flush to make data queryable
  await milvus.flush({ collection_names: [COLLECTION_NAME] });
}

async function deleteKBEntriesByKbId(kbId: string): Promise<void> {
  try {
  await milvus.delete({ collection_name: COLLECTION_NAME, filter: `kb_id == "${kbId}"` } as any);
    await milvus.flush({ collection_names: [COLLECTION_NAME] });
  } catch (e) {
    console.warn('Milvus delete failed', e);
  }
}

export { createKBCollection, insertKBEntries, searchSimilarContent, upsertKBEntry, deleteKBEntriesByKbId };

async function searchSimilarContent(queryEmbedding: number[], limit: number = 5): Promise<Array<{ content: string; similarity: number }>> {
  const searchRes = await milvus.search({
    collection_name: COLLECTION_NAME,
    vector: queryEmbedding,
    limit,
    output_fields: ['content'],
    vector_field: 'embedding',
    metric_type: 'L2',
  });

  return searchRes.results.map(result => ({
    content: result.content,
    similarity: 1 - result.score, // Convert L2 distance to similarity score
  }));
}

// Example usage:
async function example() {
  try {
    // Create collection and index
    await createKBCollection();

    // Example entries (you would generate embeddings using your model)
    const sampleEntries: KBEntry[] = [
      {
        content: "Sample KB entry 1",
        embedding: Array(VECTOR_DIM).fill(0).map(() => Math.random()), // Replace with real embeddings
      },
      {
        content: "Sample KB entry 2",
        embedding: Array(VECTOR_DIM).fill(0).map(() => Math.random()), // Replace with real embeddings
      },
    ];

    // Insert entries
    await insertKBEntries(sampleEntries);

    // Search similar content
    const queryEmbedding = Array(VECTOR_DIM).fill(0).map(() => Math.random()); // Replace with real query embedding
    const results = await searchSimilarContent(queryEmbedding);
    console.log('Search results:', results);
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run example
example().catch(console.error);
