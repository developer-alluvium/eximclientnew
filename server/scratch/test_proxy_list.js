import axios from "axios";

async function test() {
  try {
    console.log("Calling proxy endpoint http://localhost:9003/api/eway-bill/list?search=9891284 ...");
    const res = await axios.get("http://localhost:9003/api/eway-bill/list?search=9891284");
    console.log("Response status:", res.status);
    console.log("Response data:", JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error("Error calling proxy:", err.message);
    if (err.response) {
      console.error("Status:", err.response.status);
      console.error("Data:", err.response.data);
    }
  }
}

test();
