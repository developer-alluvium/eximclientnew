import { createContext, useState, useEffect } from "react";
import { getJsonCookie, removeCookie } from "../utils/cookies";

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check for stored user data on component mount (migrated to cookies)
    const storedUser = getJsonCookie("exim_user");
    if (storedUser) {
      setUser(storedUser);
    }
  }, []);

  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  );
};
