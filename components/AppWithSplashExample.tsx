import React, { useState } from 'react';
import CustomSplashScreen from '@/components/CustomSplashScreen';
// Import your existing app components
// import WelcomeScreen from './app/welcome';

/**
 * Main App with Splash Screen Integration
 * Shows custom splash screen after native splash, then loads main app
 */
export default function AppWithSplash() {
  const [showSplash, setShowSplash] = useState(true);

  // Show custom splash screen
  if (showSplash) {
    return (
      <CustomSplashScreen 
        onFinish={() => setShowSplash(false)}
      />
    );
  }

  // Show your main app after splash
  return (
    // Replace this with your actual main app component
    // For example: <WelcomeScreen />
    <div>Your Main App Goes Here</div>
  );
}

/**
 * Usage:
 * 1. Replace your main App export with this component
 * 2. Import your actual main app component
 * 3. Replace the placeholder div with your main component
 * 
 * The flow will be:
 * Native Splash (immediate) → Custom Splash (2 seconds) → Main App
 */
