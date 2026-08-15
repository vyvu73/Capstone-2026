// test-mongo.js
import { createMongoStore } from './mongoStore.ts';
import dotenv from 'dotenv';

dotenv.config();

const store = await createMongoStore();
console.log("hello")
console.log('MONGODB_URI:', process.env.MONGODB_URI ? '✅ Set' : '❌ Not set');

if (store) {
  console.log('✅ MongoDB connected successfully!');
  
  // Test insert
  await store.insert({
    wpm: 65,
    accuracy: 95,
    createdAt: new Date(),
    // Add other fields your TestResult type requires
  });
  console.log('✅ Test data inserted');
  
  // Test retrieve
  const recent = await store.recent(5);
  console.log(`✅ Retrieved ${recent.length} recent results`);
} else {
  console.log('❌ MongoDB connection failed');
}