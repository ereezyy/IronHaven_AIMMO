import React, { useState, useEffect } from 'react';

interface MobileWarningProps {
  onDismiss?: () => void;
}

const MobileWarning: React.FC<MobileWarningProps> = ({ onDismiss }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobileDevice = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const mobileKeywords = ['mobile', 'android', 'iphone', 'ipad', 'ipod', 'blackberry', 'windows phone'];
      const isMobileUA = mobileKeywords.some(keyword => userAgent.includes(keyword));
      
      // Also check screen size
      const isSmallScreen = window.innerWidth <= 768 || window.innerHeight <= 600;
      
      // Check for touch capability
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      
      const mobileDetected = isMobileUA || (isSmallScreen && isTouchDevice);
      
      setIsMobile(mobileDetected);
      
      // Show warning if mobile and not previously dismissed
      if (mobileDetected && !localStorage.getItem('ironhaven-mobile-warning-dismissed')) {
        setIsVisible(true);
      }
    };

    checkMobileDevice();
    
    // Re-check on window resize
    window.addEventListener('resize', checkMobileDevice);
    return () => window.removeEventListener('resize', checkMobileDevice);
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('ironhaven-mobile-warning-dismissed', 'true');
    onDismiss?.();
  };

  const handleContinueAnyway = () => {
    handleDismiss();
  };

  if (!isVisible || !isMobile) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-red-900/90 to-black border-2 border-red-500 rounded-lg max-w-md w-full p-6 text-center shadow-2xl">
        {/* Warning Icon */}
        <div className="mb-4">
          <div className="mx-auto w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-xl font-bold text-red-400 mb-3">
          🖥️ PC OPTIMIZED EXPERIENCE
        </h2>

        {/* Message */}
        <div className="text-gray-300 mb-6 space-y-2">
          <p className="text-sm">
            <strong className="text-white">IronHaven AIMMO</strong> is optimized for desktop/PC gaming with:
          </p>
          <ul className="text-xs text-left space-y-1 mt-3">
            <li>• <strong>Keyboard & Mouse Controls</strong></li>
            <li>• <strong>High-Resolution Graphics</strong></li>
            <li>• <strong>Complex 3D Interactions</strong></li>
            <li>• <strong>AI-Powered Features</strong></li>
          </ul>
          <p className="text-xs text-yellow-400 mt-3">
            For the best experience, please visit on a desktop computer.
          </p>
        </div>

        {/* Device Info */}
        <div className="bg-black/50 rounded p-3 mb-4 text-xs">
          <div className="text-gray-400">Detected Device:</div>
          <div className="text-white">
            📱 Mobile/Tablet ({window.innerWidth}x{window.innerHeight})
          </div>
        </div>

        {/* Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleContinueAnyway}
            className="w-full bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded font-semibold transition-colors"
          >
            Continue Anyway
          </button>
          
          <div className="text-xs text-gray-400">
            This warning won't show again on this device
          </div>
        </div>

        {/* Hackathon Note */}
        <div className="mt-4 pt-4 border-t border-red-500/30">
          <div className="text-xs text-purple-400">
            🏆 <strong>Bolt Hackathon 2025 Entry</strong>
          </div>
          <div className="text-xs text-gray-400 mt-1">
            AI-Powered Cyberpunk Gaming Experience
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileWarning;

