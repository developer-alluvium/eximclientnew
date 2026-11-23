import '../fix-dns.js';
import mongoose from 'mongoose';

const dbUri = 'mongodb+srv://react_db_user:m5o1X7QnWdAKeuu5@cluster0.tcmfe6d.mongodb.net/exim';
await mongoose.connect(dbUri);

const ewbs = await mongoose.connection.db.collection('ewaybills').find({
  $or: [
    { docNo: '3770941' },
    { docNo: '3612655' },
    { document_no: '3770941' },
    { document_no: '3612655' }
  ]
}).toArray();
console.log('Found in ewaybills:', JSON.stringify(ewbs, null, 2));

const recent = await mongoose.connection.db.collection('ewaybills').find().sort({ _id: -1 }).limit(3).toArray();
console.log('Recent 3 in ewaybills:', JSON.stringify(recent, null, 2));

await mongoose.disconnect();
