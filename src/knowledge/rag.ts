import { OpenAIEmbeddings } from "@langchain/openai";
import { HNSWLib } from "@langchain/community/vectorstores/hnswlib";
import { DirectoryLoader } from "langchain/document_loaders/fs/directory";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import * as fs from "fs";

const VECTOR_STORE_PATH = "src/knowledge/vector_store";
const KB_PATH = "src/knowledge/kb";

export async function generateAndStoreEmbeddings() {
    const loader = new DirectoryLoader(KB_PATH, {
        ".md": (path) => new TextLoader(path),
    });

    const docs = await loader.load();

    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
    });

    const splittedDocs = await splitter.splitDocuments(docs);

    const embeddings = new OpenAIEmbeddings();

    const vectorStore = await HNSWLib.fromDocuments(splittedDocs, embeddings);

    if (!fs.existsSync(VECTOR_STORE_PATH)) {
        fs.mkdirSync(VECTOR_STORE_PATH, { recursive: true });
    }

    await vectorStore.save(VECTOR_STORE_PATH);
    console.log("Vector store saved successfully!");
}

export async function search(query: string, k = 1) {
    const embeddings = new OpenAIEmbeddings();
    const vectorStore = await HNSWLib.load(VECTOR_STORE_PATH, embeddings);
    return await vectorStore.similaritySearch(query, k);
}
