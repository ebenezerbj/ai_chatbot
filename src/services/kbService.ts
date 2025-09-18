import KBEntryModel, { KBEntryDocument } from '../models/KBEntry';
import { KBEntryDTO } from '../types/kb';
import { EmbeddingService } from './embeddingService';
import { upsertKBEntry, deleteKBEntriesByKbId } from '../knowledge/milvusSetup';

export class KBService {
  async getAllEntries(): Promise<KBEntryDocument[]> {
    return await KBEntryModel.find({}).exec();
  }

  async getEntryById(id: string): Promise<KBEntryDocument | null> {
    return await KBEntryModel.findById(id).exec();
  }

  async createEntry(entry: KBEntryDTO): Promise<KBEntryDocument> {
    const newEntry = new KBEntryModel(entry);
    const saved = await newEntry.save();

    // fire-and-forget: generate embedding and upsert into Milvus
    (async () => {
      try {
  const embSvc = EmbeddingService.getInstance();
  const text = `${saved.product} ${saved.answer}`;
  const embedding = await embSvc.generateEmbedding(text);
  await upsertKBEntry((saved._id as any).toString(), text, embedding);
      } catch (e) {
        // log but don't fail request
        console.error('Failed to sync KB entry to Milvus', e);
      }
    })();

    return saved;
  }

  async updateEntry(id: string, update: Partial<KBEntryDTO>): Promise<KBEntryDocument | null> {
    const updated = await KBEntryModel.findByIdAndUpdate(id, update, { new: true }).exec();
    if (updated) {
      (async () => {
        try {
          const embSvc = EmbeddingService.getInstance();
          const text = `${updated.product} ${updated.answer}`;
          const embedding = await embSvc.generateEmbedding(text);
          await upsertKBEntry((updated._id as any).toString(), text, embedding);
        } catch (e) {
          console.error('Failed to sync updated KB entry to Milvus', e);
        }
      })();
    }
    return updated;
  }

  async deleteEntry(id: string): Promise<KBEntryDocument | null> {
    const deleted = await KBEntryModel.findByIdAndDelete(id).exec();
    if (deleted) {
      (async () => {
        try {
          await deleteKBEntriesByKbId((deleted._id as any).toString());
        } catch (e) {
          console.error('Failed to delete KB entry from Milvus', e);
        }
      })();
    }
    return deleted;
  }

  async searchEntries(query: string): Promise<KBEntryDocument[]> {
    return await KBEntryModel.find({
      $or: [
        { product: { $regex: query, $options: 'i' } },
        { answer: { $regex: query, $options: 'i' } }
      ]
    }).exec();
  }
}

export const kbService = new KBService();
