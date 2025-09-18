import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/ai_chatbot';

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB connection successful!');
    return mongoose.disconnect();
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err.message);
  });
