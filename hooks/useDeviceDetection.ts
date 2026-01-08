"use client";

import { useState, useEffect } from "react";

interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  userAgent: string;
}

export function useDeviceDetection(): DeviceInfo {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    userAgent: "",
  });

  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    
    // Mobile detection
    const isMobile = /mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
    
    // Tablet detection
    const isTablet = /ipad|android(?!.*mobile)|tablet/i.test(userAgent);
    
    // Desktop (not mobile and not tablet)
    const isDesktop = !isMobile && !isTablet;

    setDeviceInfo({
      isMobile,
      isTablet,
      isDesktop,
      userAgent: navigator.userAgent,
    });
  }, []);

  return deviceInfo;
}

