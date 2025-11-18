import React, { createContext, useState, useEffect } from "react";
import axios from "axios";
import { getJsonCookie, setJsonCookie, removeCookie } from "../utils/cookies";

export const UserContext = createContext(null);

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const storedUser = getJsonCookie("exim_user");
    return storedUser ? storedUser : null;
  });

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuthentication = async () => {
      // Only attempt verification if we have a token in cookies
      const hasSessionCookie = document.cookie.includes("exim_token");

      if (!hasSessionCookie) {
        console.log("No session cookie found, skipping verification");
        setIsLoading(false);
        return;
      }

      try {
        const response = await axios.get(
          `${process.env.REACT_APP_API_STRING}/verify-session`,
          {
            withCredentials: true,
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
        // migrate: store user data in cookie (if desired)
        // setJsonCookie('exim_user', response.data);
        setUser(response.data);
      } catch (error) {
        console.error("Authentication check failed:", error.message);
        // Don't immediately clear localStorage on failure
        // Only clear if the server explicitly says the session is invalid
        if (error.response && error.response.status === 401) {
          removeCookie("exim_user");
          setUser(null);
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthentication();
  }, []);

  const logout = async () => {
    try {
      await axios.post(
        `${process.env.REACT_APP_API_STRING}/logout`,
        {},
        {
          withCredentials: true,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      removeCookie("exim_user");
      setUser(null);
    } catch (error) {
      console.error("Logout failed", error);
      throw error;
    }
  };

  return (
    <UserContext.Provider value={{ user, setUser, logout, isLoading }}>
      {children}
    </UserContext.Provider>
  );
};
