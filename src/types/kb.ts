export type KBEntryDTO = {
  product: string;
  questionPatterns: string[];
  answer: string;
  tags?: string[];
  createdAt?: Date;
  updatedAt?: Date;
};
