import axios from "axios";

export const getCityAndStateByPinCode = async (pinCode) => {
  try {
    const response = await axios.get(
      `${process.env.REACT_APP_API_STRING}/eway-bill/pincode/${pinCode}`
    );
    if (
      response.data &&
      response.data[0].Status === "Success" &&
      response.data[0].PostOffice &&
      response.data[0].PostOffice.length > 0
    ) {
      const offices = response.data[0].PostOffice;
      
      const uniqueNamesMap = new Map();
      offices.forEach(po => {
        if (po.Name && po.Name.trim() !== "") {
          const name = po.Name.trim();
          const block = po.Block ? po.Block.trim() : "";
          const state = po.State ? po.State.trim() : "";
          const district = po.District ? po.District.trim() : "";
          const key = `${name}||${block}||${state}`;
          if (!uniqueNamesMap.has(key)) {
            uniqueNamesMap.set(key, {
              city: name,
              name,
              block,
              state,
              district,
            });
          }
        }
      });
      const uniqueOptions = Array.from(uniqueNamesMap.values());

      if (uniqueOptions.length > 0) {
        return {
          city: uniqueOptions[0].city,
          state: uniqueOptions[0].state,
          options: uniqueOptions
        };
      }
      throw new Error("No valid options found for this pin code");
    } else {
      throw new Error("No data found for this pin code");
    }
  } catch (error) {
    console.error("Error fetching data:", error);
    return null;
  }
};
