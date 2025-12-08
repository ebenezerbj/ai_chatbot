import KBEntryModel, { KBEntryDocument } from '../models/KBEntry';
import { KBEntryDTO } from '../types/kb';
import { EmbeddingService } from './embeddingService';
import { upsertKBEntry, deleteKBEntriesByKbId } from '../knowledge/milvusSetup';

// Helper to check if MongoDB is connected
function isMongoConnected(): boolean {
  try {
    return require('mongoose').connection.readyState === 1;
  } catch {
    return false;
  }
}

export class KBService {
  async getAllEntries(): Promise<KBEntryDocument[]> {
    try {
      if (!isMongoConnected()) return [];
      return await KBEntryModel.find({}).exec();
    } catch (e) {
      console.error('Error fetching KB entries from MongoDB:', e);
      return [];
    }
  }

  async getEntryById(id: string): Promise<KBEntryDocument | null> {
    try {
      if (!isMongoConnected()) return null;
      return await KBEntryModel.findById(id).exec();
    } catch (e) {
      console.error('Error fetching KB entry from MongoDB:', e);
      return null;
    }
  }

  async createEntry(entry: KBEntryDTO): Promise<KBEntryDocument> {
    if (!isMongoConnected()) {
      throw new Error('MongoDB is not connected. Cannot save KB entry.');
    }
    try {
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
    } catch (e) {
      console.error('Error creating KB entry in MongoDB:', e);
      throw e;
    }
  }

  async updateEntry(id: string, update: Partial<KBEntryDTO>): Promise<KBEntryDocument | null> {
    if (!isMongoConnected()) {
      console.warn('MongoDB is not connected. Cannot update KB entry.');
      return null;
    }
    try {
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
    } catch (e) {
      console.error('Error updating KB entry in MongoDB:', e);
      return null;
    }
  }

  async deleteEntry(id: string): Promise<KBEntryDocument | null> {
    if (!isMongoConnected()) {
      console.warn('MongoDB is not connected. Cannot delete KB entry.');
      return null;
    }
    try {
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
    } catch (e) {
      console.error('Error deleting KB entry from MongoDB:', e);
      return null;
    }
  }

  async searchEntries(query: string): Promise<KBEntryDocument[]> {
    try {
      if (!isMongoConnected()) return [];
      return await KBEntryModel.find({
        $or: [
          { product: { $regex: query, $options: 'i' } },
          { answer: { $regex: query, $options: 'i' } }
        ]
      }).exec();
    } catch (e) {
      console.error('Error searching KB entries in MongoDB:', e);
      return [];
    }
  }
}

export const kbService = new KBService();
