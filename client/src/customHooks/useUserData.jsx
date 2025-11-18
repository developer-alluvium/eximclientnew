import { useState, useEffect } from "react";
import axios from "axios";
import { getCookie, setJsonCookie, removeCookie } from "../utils/cookies";
import { useNavigate } from "react-router-dom";

export const useUserData = () => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const fetchUserData = async () => {
    try {
      const token = getCookie("access_token");
      if (!token) {
        navigate("/login");
        return;
      }

      const response = await axios.get(
        `${process.env.REACT_APP_API_STRING}/users/current`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          withCredentials: true,
        }
      );

      if (response.data.success) {
        const userData = response.data.data.user;
        setJsonCookie("exim_user", userData);
        setUserData(userData);
        return userData;
      }
    } catch (error) {
      console.error("Failed to fetch user data:", error);
      if (error.response?.status === 401) {
        handleLogout();
      }
      setError("Failed to fetch user data");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post(
        `${process.env.REACT_APP_API_STRING}/users/logout`,
        {},
        { withCredentials: true }
      );
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      removeCookie("exim_user");
      removeCookie("access_token");
      removeCookie("refresh_token");
      removeCookie("sso_token");
      navigate("/login", { replace: true });
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  const refreshUserData = () => {
    return fetchUserData();
  };

  return { userData, loading, error, refreshUserData, handleLogout };
};
