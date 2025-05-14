// ElevenLabs configuration and initialization helper

// Dynamically inject the ElevenLabs widget if not already in DOM
function ensureWidgetExists() {
  // Check if widget element already exists
  if (!document.querySelector('elevenlabs-convai')) {
    // Create the widget element
    const widgetElement = document.createElement('elevenlabs-convai');
    widgetElement.setAttribute('agent-id', 'ILPY2IqriwITluecMOAb');
    document.body.appendChild(widgetElement);
    
    // Add the script if it doesn't exist
    if (!document.querySelector('script[src*="elevenlabs.io/convai-widget"]')) {
      const scriptElement = document.createElement('script');
      scriptElement.src = 'https://elevenlabs.io/convai-widget/index.js';
      scriptElement.async = true;
      scriptElement.type = 'text/javascript';
      document.body.appendChild(scriptElement);
    }
    
    console.log('ElevenLabs Convai Widget dynamically injected');
  }
}

// Initialize ElevenLabs widget configuration
export function initializeElevenLabsWidget() {
  // Ensure the widget exists in both preview and deployed environments
  ensureWidgetExists();
  
  // Log initialization
  console.log('ElevenLabs Convai Widget initialized');
  
  // The widget will automatically use the ELEVENLABS_SIGNING_KEY from environment variables
  // No additional configuration needed as it's handled by the ElevenLabs script
}