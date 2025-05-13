// ElevenLabs configuration
export const ELEVENLABS_CONFIG = {
  // This is just a placeholder to indicate that we're using environment variables
  // The actual key is safely stored in environment variables and accessed by the widget
  // No need to explicitly pass the signing key, the widget will use it from environment
};

// Initialize ElevenLabs widget configuration
export function initializeElevenLabsWidget() {
  // The widget is automatically initialized from the script in index.html
  console.log('ElevenLabs Convai Widget initialized');
  
  // The widget will automatically use the ELEVENLABS_SIGNING_KEY from environment variables
  // No additional configuration needed as it's handled by the ElevenLabs script
}