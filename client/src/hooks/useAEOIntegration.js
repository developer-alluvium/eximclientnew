// hooks/useAEOIntegration.js
import { useState, useContext } from "react";
import { UserContext } from "../context/UserContext";
import { getCookie, getJsonCookie } from "../utils/cookies";

export const useAEOIntegration = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [kycSummary, setKycSummary] = useState(null); // Add this line
  const { user } = useContext(UserContext);

  // Add the missing functions that UserProfile expects
  const autoVerifyImporters = async () => {
    console.log("🔄 autoVerifyImporters function called");
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_STRING}/aeo/auto-verify`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${getCookie("access_token")}`,
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();
      console.log("✅ autoVerifyImporters response:", data);

      if (!data.success) {
        throw new Error(data.message);
      }

      return data;
    } catch (err) {
      console.error("❌ autoVerifyImporters error:", err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const fetchKYCSummary = async () => {
    console.log("🔄 fetchKYCSummary function called");
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_STRING}/aeo/kyc-summary`,
        {
          headers: {
            Authorization: `Bearer ${getCookie("access_token")}`,
          },
        }
      );

      const data = await response.json();
      console.log("✅ fetchKYCSummary response:", data);

      if (data.success) {
        setKycSummary(data);
      } else {
        throw new Error(data.message);
      }

      return data;
    } catch (err) {
      console.error("❌ fetchKYCSummary error:", err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const menuLookup = async (importerName) => {
    console.log("🔧 menuLookup hook is being called");
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_STRING}/aeo/menu-lookup`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${getCookie("access_token")}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ importerName }),
        }
      );

      const data = await response.json();
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const profileLookup = async (importerName, ieCode) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_STRING}/aeo/profile-lookup`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${getCookie("access_token")}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ importerName, ieCode }),
        }
      );

      const data = await response.json();
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };
  const userData = getJsonCookie("exim_user");
  const userId = userData?.id;

  const updateImporterName = async (ieCode, newImporterName) => {
    console.log("🔄 updateImporterName function called", {
      ieCode,
      newImporterName,
    });
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_STRING}/aeo/update-importer-name`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${getCookie("access_token")}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId,
            ieCode,
            importerName: newImporterName,
          }),
        }
      );

      const data = await response.json();
      console.log("✅ updateImporterName response:", data);

      if (!data.success) {
        throw new Error(data.message);
      }

      return data;
    } catch (err) {
      console.error("❌ updateImporterName error:", err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Return ALL the functions that UserProfile expects
  return {
    loading,
    error,
    kycSummary, // Add this
    autoVerifyImporters, // Add this - this was missing!
    fetchKYCSummary, // Add this - this was missing!
    menuLookup,
    profileLookup,
    updateImporterName,
  };
};
