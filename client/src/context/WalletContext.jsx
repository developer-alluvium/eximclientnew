import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
import axios from "../utils/axiosConfig";
import { getCookie } from "../utils/cookies";
import RechargeModal from "../components/wallet/RechargeModal";

export const WalletContext = createContext();

const DEFAULT_WALLET_STATE = {
  availableCredits: 0,
  blockedCredits: 0,
  effectiveBalance: 0,
  walletServiceStatus: "INACTIVE",
  isFirstTimeActivated: false,
  isFreeTrial: false,
  validUntil: null,
  daysRemaining: null,
  isExpired: false,
  pricingTier: "STANDARD_COMMERCIAL",
  pricingReason: "",
  currencyRate: "1 Credit = ₹9",
};

const getAuthToken = () => {
  return (
    getCookie("access_token") ||
    getCookie("user_access_token") ||
    getCookie("superadmin_token") ||
    getCookie("superadmin_access_token") ||
    getCookie("admin_access_token") ||
    getCookie("customer_admin_access_token") ||
    getCookie("token") ||
    getCookie("exim_token")
  );
};

export const WalletProvider = ({ children }) => {
  const location = useLocation();
  const [wallet, setWallet] = useState(DEFAULT_WALLET_STATE);
  const [loading, setLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isRechargeModalOpen, setIsRechargeModalOpen] = useState(false);
  const [rechargeReason, setRechargeReason] = useState("");
  const isFetchingRef = useRef(false);

  const fetchBalance = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setWallet(DEFAULT_WALLET_STATE);
      setIsInitialized(true);
      setLoading(false);
      return;
    }

    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      setLoading(true);
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/eway-bill/wallet/balance`);
      if (res.data?.success && res.data?.data) {
        const d = res.data.data;
        const computedFreeTrial = Boolean(
          d.isFreeTrial ||
          (d.walletServiceStatus === "ACTIVE" &&
           d.isFirstTimeActivated &&
           d.validUntil &&
           new Date() <= new Date(d.validUntil))
        );
        setWallet({ ...d, isFreeTrial: computedFreeTrial });
      }
    } catch (err) {
      console.warn("Could not fetch wallet balance:", err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
      setIsInitialized(true);
      isFetchingRef.current = false;
    }
  }, []);

  // 1. Initial mount fetch
  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  // 2. Fetch on route changes (e.g. from /user/login -> /user/dashboard)
  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      fetchBalance();
    }
  }, [location?.pathname, fetchBalance]);

  // 3. Global event listeners for immediate sync upon login, logout, and window focus
  useEffect(() => {
    const handleLoginOrRefresh = () => {
      fetchBalance();
    };

    const handleLogout = () => {
      setWallet(DEFAULT_WALLET_STATE);
      setIsInitialized(false);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const token = getAuthToken();
        if (token) {
          fetchBalance();
        }
      }
    };

    window.addEventListener("wallet:refresh", handleLoginOrRefresh);
    window.addEventListener("exim:login", handleLoginOrRefresh);
    window.addEventListener("exim:logout", handleLogout);
    window.addEventListener("storage", handleLoginOrRefresh);
    window.addEventListener("focus", handleLoginOrRefresh);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("wallet:refresh", handleLoginOrRefresh);
      window.removeEventListener("exim:login", handleLoginOrRefresh);
      window.removeEventListener("exim:logout", handleLogout);
      window.removeEventListener("storage", handleLoginOrRefresh);
      window.removeEventListener("focus", handleLoginOrRefresh);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchBalance]);

  const openRechargeModal = (reason = "") => {
    setRechargeReason(reason);
    setIsRechargeModalOpen(true);
  };

  const closeRechargeModal = () => {
    setIsRechargeModalOpen(false);
    setRechargeReason("");
  };

  const isFreeTrial = Boolean(
    wallet.isFreeTrial ||
    (wallet.walletServiceStatus === "ACTIVE" &&
     wallet.isFirstTimeActivated &&
     wallet.validUntil &&
     new Date() <= new Date(wallet.validUntil))
  );

  return (
    <WalletContext.Provider
      value={{
        wallet,
        balance: wallet.effectiveBalance,
        availableCredits: wallet.availableCredits,
        blockedCredits: wallet.blockedCredits,
        walletServiceStatus: wallet.walletServiceStatus || "INACTIVE",
        isFirstTimeActivated: wallet.isFirstTimeActivated || false,
        isFreeTrial,
        validUntil: wallet.validUntil,
        daysRemaining: wallet.daysRemaining,
        isExpired: wallet.isExpired,
        pricingTier: wallet.pricingTier,
        pricingReason: wallet.pricingReason,
        currencyRate: wallet.currencyRate,
        loading,
        isInitialized,
        refreshBalance: fetchBalance,
        isRechargeModalOpen,
        openRechargeModal,
        closeRechargeModal,
        rechargeReason,
      }}
    >
      {children}
      <RechargeModal open={isRechargeModalOpen} onClose={closeRechargeModal} />
    </WalletContext.Provider>
  );
};

/**
 * Custom Hook: useWallet
 * Access wallet balance and control top-up modal from anywhere in the application.
 */
export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
};

export default WalletContext;
