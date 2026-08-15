import 'dotenv/config';
import { createMongoStore } from './server/stores/mongoStore.js';

console.log('MONGODB_URI:', process.env.MONGODB_URI ? '✅ Set' : '❌ Not set');

const store = await createMongoStore();
console.log(store ? '✅ Connected!' : '❌ Failed');