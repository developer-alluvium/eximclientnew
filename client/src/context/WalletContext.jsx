import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import axios from "../utils/axiosConfig";
import { getCookie } from "../utils/cookies";
import RechargeModal from "../components/wallet/RechargeModal";

export const WalletContext = createContext();

export const WalletProvider = ({ children }) => {
  const [wallet, setWallet] = useState({
    availableCredits: 0,
    blockedCredits: 0,
    effectiveBalance: 0,
    pricingTier: "STANDARD_COMMERCIAL",
    pricingReason: "",
    currencyRate: "1 Credit = ₹9",
  });
  const [loading, setLoading] = useState(false);
  const [isRechargeModalOpen, setIsRechargeModalOpen] = useState(false);
  const [rechargeReason, setRechargeReason] = useState("");

  const fetchBalance = useCallback(async () => {
    // Only fetch if user has an auth token
    const token = getCookie("access_token") || getCookie("exim_token");
    if (!token) return;

    try {
      setLoading(true);
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/eway-bill/wallet/balance`);
      if (res.data?.success && res.data?.data) {
        setWallet(res.data.data);
      }
    } catch (err) {
      // Don't show loud errors on initial balance fetch
      console.warn("Could not fetch wallet balance:", err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  const openRechargeModal = (reason = "") => {
    setRechargeReason(reason);
    setIsRechargeModalOpen(true);
  };

  const closeRechargeModal = () => {
    setIsRechargeModalOpen(false);
    setRechargeReason("");
  };

  return (
    <WalletContext.Provider
      value={{
        wallet,
        balance: wallet.effectiveBalance,
        availableCredits: wallet.availableCredits,
        blockedCredits: wallet.blockedCredits,
        pricingTier: wallet.pricingTier,
        pricingReason: wallet.pricingReason,
        currencyRate: wallet.currencyRate,
        loading,
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
