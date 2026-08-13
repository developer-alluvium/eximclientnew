import axios from 'axios';

const EXPORT_API_BASE_URL = "https://eximbot.alvision.in/export/api";

async function testFilterOptions() {
  try {
    const res = await axios.get(`${EXPORT_API_BASE_URL}/operation-jobs-filters`, {
      params: { ieCode: "1388003881" },
      headers: { username: "Admin", "x-username": "Admin" }
    });
    console.log("Filter options response for 1388003881:");
    console.log(JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error("Error:", err.message);
  }
}

testFilterOptions();
