"use client"

import { createContext, useContext, useEffect, useState } from 'react';
import useMySWR from "@/components/useMySWR";
const APIContext = createContext();

export function APIProvider({ children }) {
  const { data, error, isLoading } = useMySWR("/api/backend/healthz");
  const isHealthy = !error && data?.status === "healthy";

  return (
    <APIContext.Provider value={{ isHealthy, isLoading }}>
      {children}
    </APIContext.Provider>
  );
}

export function useAPI() {
  const context = useContext(APIContext);
  if (context === undefined) {
    throw new Error('useAPI must be used within an APIProvider');
  }
  return context;
}
