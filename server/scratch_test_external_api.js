import axios from 'axios';

const BOE_API_BASE = "http://3.108.244.38:8002/api/v1";

async function test(be_date) {
  try {
    const res = await axios.get(`${BOE_API_BASE}/extract-job`, {
      params: { be_no: "2024093", be_date },
      timeout: 10000
    });
    console.log(`Format [${be_date}] Success:`, res.status, res.data);
  } catch (err) {
    console.log(`Format [${be_date}] Error:`, err.response?.status, err.response?.data || err.message);
  }
}

async function run() {
  await test("2026-06-20");
  await test("20/06/2026");
  await test("20-06-2026");
  await test("2026/06/20");
}

run();
