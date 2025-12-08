import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/ai_chatbot';

export async function connectDB() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    console.warn('MongoDB is unavailable. The app will continue without database persistence. KB data will be loaded from files only.');
    // Don't exit - allow app to continue without MongoDB
    // This is useful for development and for deployments without a MongoDB service
  }
}
