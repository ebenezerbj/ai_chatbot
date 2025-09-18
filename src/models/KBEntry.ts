import mongoose, { Document, Model } from 'mongoose';
import { KBEntryDTO } from '../types/kb';

export interface KBEntryDocument extends KBEntryDTO, Document {}

const KBEntrySchema = new mongoose.Schema<KBEntryDocument>({
  product: { type: String, required: true },
  questionPatterns: { type: [String], required: true },
  answer: { type: String, required: true },
  tags: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const KBEntryModel: Model<KBEntryDocument> = mongoose.model<KBEntryDocument>('KBEntry', KBEntrySchema);

export default KBEntryModel;
