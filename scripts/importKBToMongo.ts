import mongoose from 'mongoose';
import KBEntry from '../src/models/KBEntry';
import fs from 'fs';
import path from 'path';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/ai_chatbot';
const KB_JSON_PATH = path.join(__dirname, '../data/kb.json');

async function importKB() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const raw = fs.readFileSync(KB_JSON_PATH, 'utf-8');
  const data = JSON.parse(raw);

  // Map patterns to string for storage
  const entries = data.map((d: any) => ({
    product: d.product,
    questionPatterns: d.patterns || d.questionPatterns || [],
    answer: d.answer,
    tags: d.tags || [],
  }));

  await KBEntry.deleteMany({});
  await KBEntry.insertMany(entries);
  console.log(`Imported ${entries.length} KB entries.`);

  await mongoose.disconnect();
  console.log('Disconnected from MongoDB');
}

importKB().catch((err) => {
  console.error('Import failed:', err);
  process.exit(1);
});
