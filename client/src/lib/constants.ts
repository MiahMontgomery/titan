// Color constants
export const COLORS = {
  background: {
    dark: '#0d0d0d',
    light: '#121212'
  },
  accent: {
    primary: '#39FF14',
    primaryTransparent: 'rgba(57, 255, 20, 0.2)'
  },
  text: {
    primary: '#FFFFFF',
    secondary: '#A9A9A9'
  },
  border: {
    inactive: '#4A4A4A'
  },
  card: '#0e0e0e',
  statuses: {
    success: '#4ADE80',
    error: '#F87171',
    warning: '#FBBF24',
    info: '#38BDF8'
  }
};

// Tab names and labels
export const TABS = [
  { id: 'progress', label: 'Progress' },
  { id: 'input', label: 'Input' },
  { id: 'logs', label: 'Logs' },
  { id: 'output', label: 'Output' },
  { id: 'sales', label: 'Sales' }
];

// Websocket events
export const WS_EVENTS = {
  PROJECT_CREATED: 'project_created',
  PROJECT_UPDATED: 'project_updated',
  FEATURE_CREATED: 'feature_created',
  FEATURE_UPDATED: 'feature_updated',
  MILESTONE_CREATED: 'milestone_created',
  MILESTONE_UPDATED: 'milestone_updated',
  GOAL_CREATED: 'goal_created',
  GOAL_UPDATED: 'goal_updated',
  MESSAGE_CREATED: 'message_created',
  LOG_CREATED: 'log_created',
  OUTPUT_CREATED: 'output_created',
  OUTPUT_UPDATED: 'output_updated',
  SALE_CREATED: 'sale_created'
};

// Message senders
export const SENDERS = {
  USER: 'user',
  JASON: 'jason'
};

// Log types
export const LOG_TYPES = {
  EXECUTION: 'execution',
  FEATURE_UPDATE: 'feature_update',
  ROLLBACK: 'rollback',
  PROJECT_PUSH: 'project_push'
};

// Output types
export const OUTPUT_TYPES = {
  AUDIO: 'audio',
  VIDEO: 'video',
  PDF: 'pdf',
  DOCUMENT: 'document',
  IMAGE: 'image',
  CODE: 'code'
};

// Sale platforms
export const SALE_PLATFORMS = {
  SHOPIFY: 'shopify',
  FANSLY: 'fansly',
  PATREON: 'patreon',
  GUMROAD: 'gumroad',
  OTHER: 'other'
};

// Animation durations
export const ANIMATION = {
  SHORT: 200,
  MEDIUM: 300,
  LONG: 500
};

// Date formats
export const DATE_FORMATS = {
  MESSAGE_TIME: 'h:mm a',
  LOG_DATE: 'MMM d, yyyy',
  LOG_TIME: 'h:mm a'
};
