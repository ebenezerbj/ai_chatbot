import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { HNSWLib } from "@langchain/community/vectorstores/hnswlib";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { PromptTemplate } from "@langchain/core/prompts";
import {
  RunnablePassthrough,
  RunnableSequence,
} from "@langchain/core/runnables";
import { formatDocumentsAsString } from "langchain/util/document";

const VECTOR_STORE_PATH = "src/knowledge/vector_store";

let chain: RunnableSequence;

async function initializeChain() {
    if (chain) {
        return;
    }

    const llm = new ChatOpenAI({});
    const embeddings = new OpenAIEmbeddings();
    const vectorStore = await HNSWLib.load(VECTOR_STORE_PATH, embeddings);
    const retriever = vectorStore.asRetriever();

    const prompt =
      PromptTemplate.fromTemplate(`Answer the question based only on the following context:
    {context}
    
    Question: {question}`);

    chain = RunnableSequence.from([
      {
        context: retriever.pipe(formatDocumentsAsString),
        question: new RunnablePassthrough(),
      },
      prompt,
      llm,
      new StringOutputParser(),
    ]);
}

export async function getRagResponse(query: string): Promise<string> {
    await initializeChain();
    return await chain.invoke(query);
}
