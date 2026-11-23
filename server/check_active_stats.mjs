import mongoose from 'mongoose';

async function run() {
  await mongoose.connect('mongodb://localhost:27017/exim');
  const db = mongoose.connection.db;

  // Let's check total containers and lr_completed values in prdatas
  const stats = await db.collection('prdatas').aggregate([
    { $unwind: "$containers" },
    {
      $group: {
        _id: "$containers.lr_completed",
        count: { $sum: 1 }
      }
    }
  ]).toArray();

  console.log("Containers lr_completed distribution in prdatas:");
  console.log(stats);

  // Check for the specific organisations:
  // 1. Sakar Industries: 0802000703
  // 2. Virgo Aluminium: 2209002699
  // 3. Guru Rajendra Metalloys: 0804011753
  const ieCodes = ["0802000703", "2209002699", "0804011753"];

  for (const ieCode of ieCodes) {
    const org = await db.collection('organisations').findOne({
      $or: [
        { ieCodeNo: ieCode },
        { ieCodeNo: new RegExp("^" + ieCode) }
      ]
    });
    if (!org) {
      console.log(`\nOrg not found for IE Code ${ieCode}`);
      continue;
    }
    console.log(`\n--- Org: ${org.name} (${org.ieCodeNo}, _id: ${org._id}) ---`);

    const orgContainers = await db.collection('prdatas').aggregate([
      {
        $match: {
          $or: [{ consignor: org._id }, { consignee: org._id }]
        }
      },
      { $unwind: "$containers" },
      {
        $group: {
          _id: "$containers.lr_completed",
          count: { $sum: 1 }
        }
      }
    ]).toArray();
    console.log("PR Containers count by lr_completed:", orgContainers);

    // Let's see if any active containers exist (lr_completed != true)
    const activeSample = await db.collection('prdatas').aggregate([
      {
        $match: {
          $or: [{ consignor: org._id }, { consignee: org._id }]
        }
      },
      { $unwind: "$containers" },
      {
        $match: {
          "containers.lr_completed": { $ne: true }
        }
      },
      { $limit: 3 }
    ]).toArray();

    console.log("Active containers count (sample):", activeSample.length);
    if (activeSample.length > 0) {
      activeSample.forEach(s => {
        console.log("  Sample Active Container:", {
          pr_no: s.pr_no,
          document_no: s.document_no,
          tr_no: s.containers.tr_no,
          container_number: s.containers.container_number,
          lr_completed: s.containers.lr_completed
        });
      });
    }
  }

  // Find organisations that DO have active PR containers
  const orgsWithActive = await db.collection('prdatas').aggregate([
    { $unwind: "$containers" },
    { $match: { "containers.lr_completed": { $ne: true } } },
    {
      $group: {
        _id: "$consignee",
        activeCount: { $sum: 1 }
      }
    },
    { $sort: { activeCount: -1 } },
    { $limit: 5 }
  ]).toArray();

  console.log("\nTop 5 Consignee Orgs with Active PR Containers:");
  for (const item of orgsWithActive) {
    const o = await db.collection('organisations').findOne({ _id: item._id });
    console.log(`  - Org: "${o?.name}" | ieCodeNo: "${o?.ieCodeNo}" | Active Containers: ${item.activeCount}`);
  }

  await mongoose.disconnect();
}

run();
