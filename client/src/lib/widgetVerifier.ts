/**
 * ElevenLabs Widget Verification Utility
 * This script checks if the ElevenLabs Convai widget is properly loaded on the page
 */

// Function to check if the widget element exists in the DOM
export function verifyElevenLabsWidget(): boolean {
  const widgetElement = document.querySelector('elevenlabs-convai');
  return !!widgetElement;
}

// Function to check if the widget script has loaded
export function verifyWidgetScript(): boolean {
  // Look for the script in the document
  const scriptElements = document.querySelectorAll('script');
  let scriptLoaded = false;
  
  scriptElements.forEach(script => {
    if (script.src?.includes('elevenlabs.io/convai-widget')) {
      scriptLoaded = true;
    }
  });
  
  return scriptLoaded;
}

// Function to log the widget status to console
export function logWidgetStatus(): void {
  const widgetExists = verifyElevenLabsWidget();
  const scriptLoaded = verifyWidgetScript();
  
  console.log('==========================================');
  console.log('ElevenLabs Widget Status Check:');
  console.log(`Widget element exists in DOM: ${widgetExists ? 'YES ✓' : 'NO ✗'}`);
  console.log(`Widget script loaded: ${scriptLoaded ? 'YES ✓' : 'NO ✗'}`);
  console.log('==========================================');
  
  if (!widgetExists || !scriptLoaded) {
    console.warn('ElevenLabs widget may not be properly initialized. Check if:');
    console.warn('1. The <elevenlabs-convai> element is in the HTML');
    console.warn('2. The script from elevenlabs.io is properly loaded');
    console.warn('3. The environment has the necessary ELEVENLABS_SIGNING_KEY secret');
  }
}