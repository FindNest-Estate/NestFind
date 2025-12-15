import { Platform } from 'react-native';

/**
 * Dynamic API URL Configuration
 * 
 * FOR PHYSICAL DEVICE TESTING:
 * Update PHYSICAL_DEVICE_IP with your computer's current WiFi IP.
 * Run `ipconfig` (Windows) or `ifconfig` (Mac/Linux) to find it.
 */

// ============================================
// CONFIGURATION - UPDATE THIS IP AS NEEDED
// ============================================
const PHYSICAL_DEVICE_IP = '192.168.1.2'; // <-- UPDATE THIS WHEN IP CHANGES
const PORT = '8000';

// ============================================
// AUTOMATIC DETECTION LOGIC
// ============================================

const getApiUrl = (): string => {
    // For Android - physical devices need the WiFi IP
    // Emulators need 10.0.2.2 but since we test on physical device primarily,
    // we use the physical IP. If testing on emulator, change this.
    if (Platform.OS === 'android') {
        // Uncomment the line below for EMULATOR testing:
        // return `http://10.0.2.2:${PORT}`;

        // For Physical Device:
        return `http://${PHYSICAL_DEVICE_IP}:${PORT}`;
    }

    // For iOS Simulator, localhost works directly
    if (Platform.OS === 'ios') {
        // For Simulator:
        // return `http://localhost:${PORT}`;

        // For Physical Device:
        return `http://${PHYSICAL_DEVICE_IP}:${PORT}`;
    }

    // Fallback
    return `http://localhost:${PORT}`;
};

// Export the API URL
export const API_URL = getApiUrl();

// Log the URL for debugging (remove in production)
console.log('🔗 API_URL:', API_URL);

export default API_URL;
