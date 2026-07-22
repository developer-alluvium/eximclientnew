import mongoose from 'mongoose';
import EximclientUser from './models/eximclientUserModel.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

const MONGODB_URI = process.env.PROD_MONGODB_URI;

mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    const user = await EximclientUser.findOne({ name: 'Sojith' });
    if (!user) {
       console.log("No user Sojith");
    } else {
       console.log("User:", user?.name, user?.role);
       console.log("ie_code_assignments:", user?.ie_code_assignments);
       console.log("exporter_ie_code_assignments:", user?.exporter_ie_code_assignments);
    }
    process.exit(0);
  })
  .catch(console.error);
