import "dotenv/config";
import { generateAndStoreEmbeddings, search } from "./rag";

async function testRag() {
    try {
        console.log("Generating and storing embeddings...");
        await generateAndStoreEmbeddings();

        console.log("\nTesting search functionality...");
        const query = "What is this product about?";
        const results = await search(query, 2);

        console.log(`\nQuery: "${query}"`);
        console.log("Results:");
        results.forEach((result, i) => {
            console.log(`${i + 1}. [${result.metadata.source}]`);
            console.log(`   ${result.pageContent}`);
        });

    } catch (error) {
        console.error("Test failed:", error);
    }
}

testRag().catch(console.error);

