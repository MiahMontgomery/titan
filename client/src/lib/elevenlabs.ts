// ElevenLabs configuration
export const ELEVENLABS_CONFIG = {
  // This is just a placeholder to indicate that we're using environment variables
  // The actual key is safely stored in environment variables
  signingKey: process.env.ELEVENLABS_SIGNING_KEY,
};

// Initialize ElevenLabs widget configuration
export function initializeElevenLabsWidget() {
  // The widget is automatically initialized from the script in index.html
  console.log('ElevenLabs Convai Widget initialized');
  
  // Any additional configuration can be added here if needed in the future
}