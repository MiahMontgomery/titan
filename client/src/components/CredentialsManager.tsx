import { useState } from "react";
import { Eye, EyeOff, TestTube, Save, Lock } from "lucide-react";

interface CredentialField {
  name: string;
  value: string;
  type: 'text' | 'password';
  required: boolean;
  placeholder: string;
}

interface PlatformTemplate {
  name: string;
  fields: CredentialField[];
  description: string;
}

const PLATFORM_TEMPLATES: PlatformTemplate[] = [
  {
    name: 'Twitter/X',
    description: 'Twitter API credentials for posting and engagement',
    fields: [
      { name: 'api_key', value: '', type: 'password', required: true, placeholder: 'API Key' },
      { name: 'api_secret', value: '', type: 'password', required: true, placeholder: 'API Secret' },
      { name: 'access_token', value: '', type: 'password', required: true, placeholder: 'Access Token' },
      { name: 'access_token_secret', value: '', type: 'password', required: true, placeholder: 'Access Token Secret' },
      { name: 'username', value: '', type: 'text', required: true, placeholder: 'Username' }
    ]
  },
  {
    name: 'Instagram',
    description: 'Instagram credentials for posting and stories',
    fields: [
      { name: 'username', value: '', type: 'text', required: true, placeholder: 'Username' },
      { name: 'password', value: '', type: 'password', required: true, placeholder: 'Password' },
      { name: 'session_id', value: '', type: 'password', required: false, placeholder: 'Session ID (optional)' }
    ]
  },
  {
    name: 'LinkedIn',
    description: 'LinkedIn API for professional networking',
    fields: [
      { name: 'client_id', value: '', type: 'password', required: true, placeholder: 'Client ID' },
      { name: 'client_secret', value: '', type: 'password', required: true, placeholder: 'Client Secret' },
      { name: 'access_token', value: '', type: 'password', required: true, placeholder: 'Access Token' },
      { name: 'profile_url', value: '', type: 'text', required: true, placeholder: 'Profile URL' }
    ]
  },
  {
    name: 'OpenAI/OpenRouter',
    description: 'AI content generation credentials',
    fields: [
      { name: 'api_key', value: '', type: 'password', required: true, placeholder: 'API Key' },
      { name: 'model', value: 'gpt-4-turbo', type: 'text', required: false, placeholder: 'Model (default: gpt-4-turbo)' }
    ]
  },
  {
    name: 'ElevenLabs',
    description: 'Voice synthesis for audio content',
    fields: [
      { name: 'api_key', value: '', type: 'password', required: true, placeholder: 'API Key' },
      { name: 'voice_id', value: '', type: 'text', required: false, placeholder: 'Voice ID (optional)' }
    ]
  },
  {
    name: 'Stripe',
    description: 'Payment processing for sales',
    fields: [
      { name: 'publishable_key', value: '', type: 'password', required: true, placeholder: 'Publishable Key' },
      { name: 'secret_key', value: '', type: 'password', required: true, placeholder: 'Secret Key' },
      { name: 'webhook_secret', value: '', type: 'password', required: false, placeholder: 'Webhook Secret (optional)' }
    ]
  }
];

interface CredentialsManagerProps {
  personaId: number;
  initialCredentials: Record<string, any>;
  onSave: (credentials: Record<string, any>) => Promise<void>;
  onTest?: (platform: string, credentials: Record<string, any>) => Promise<boolean>;
}

export function CredentialsManager({ personaId, initialCredentials, onSave, onTest }: CredentialsManagerProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<string>('');
  const [credentials, setCredentials] = useState<Record<string, any>>(initialCredentials);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [testing, setTesting] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, boolean>>({});

  const handleAddPlatform = () => {
    if (!selectedPlatform) return;
    
    const template = PLATFORM_TEMPLATES.find(p => p.name === selectedPlatform);
    if (!template) return;

    const platformKey = selectedPlatform.toLowerCase().replace(/\s+/g, '_');
    setCredentials(prev => ({
      ...prev,
      [platformKey]: template.fields.reduce((acc, field) => {
        acc[field.name] = field.value;
        return acc;
      }, {} as Record<string, string>)
    }));
    setSelectedPlatform('');
  };

  const updateCredential = (platform: string, field: string, value: string) => {
    setCredentials(prev => ({
      ...prev,
      [platform]: {
        ...prev[platform],
        [field]: value
      }
    }));
  };

  const removePlatform = (platform: string) => {
    const newCredentials = { ...credentials };
    delete newCredentials[platform];
    setCredentials(newCredentials);
  };

  const togglePasswordVisibility = (platform: string, field: string) => {
    const key = `${platform}_${field}`;
    setShowPasswords(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const testCredentials = async (platform: string) => {
    if (!onTest) return;
    
    setTesting(platform);
    try {
      const success = await onTest(platform, credentials[platform]);
      setTestResults(prev => ({
        ...prev,
        [platform]: success
      }));
    } finally {
      setTesting(null);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(credentials);
    } finally {
      setSaving(false);
    }
  };

  const getPlatformTemplate = (platform: string) => {
    return PLATFORM_TEMPLATES.find(p => p.name.toLowerCase().replace(/\s+/g, '_') === platform);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Credentials Management</h3>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Lock size={16} />
          <span>All credentials are encrypted</span>
        </div>
      </div>

      {/* Add New Platform */}
      <div className="bg-[#181818] p-4 rounded-lg border border-[#333333]">
        <h4 className="text-md font-medium text-white mb-3">Add Platform Credentials</h4>
        <div className="flex gap-2">
          <select
            className="flex-1 bg-[#0e0e0e] border border-[#333333] rounded px-3 py-2 text-white"
            value={selectedPlatform}
            onChange={(e) => setSelectedPlatform(e.target.value)}
          >
            <option value="">Select a platform...</option>
            {PLATFORM_TEMPLATES.map(template => (
              <option key={template.name} value={template.name}>
                {template.name}
              </option>
            ))}
          </select>
          <button
            className="px-4 py-2 bg-[#39FF14] text-black rounded font-medium"
            onClick={handleAddPlatform}
            disabled={!selectedPlatform}
          >
            Add
          </button>
        </div>
      </div>

      {/* Existing Credentials */}
      {Object.keys(credentials).length > 0 && (
        <div className="space-y-4">
          <h4 className="text-md font-medium text-white">Configured Platforms</h4>
          {Object.entries(credentials).map(([platform, platformCreds]) => {
            const template = getPlatformTemplate(platform);
            if (!template) return null;

            return (
              <div key={platform} className="bg-[#181818] p-4 rounded-lg border border-[#333333]">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h5 className="text-white font-medium">{template.name}</h5>
                    <p className="text-sm text-gray-400">{template.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {onTest && (
                      <button
                        className="px-3 py-1 bg-blue-600 text-white rounded text-sm flex items-center gap-1"
                        onClick={() => testCredentials(platform)}
                        disabled={testing === platform}
                      >
                        <TestTube size={14} />
                        {testing === platform ? 'Testing...' : 'Test'}
                      </button>
                    )}
                    <button
                      className="px-3 py-1 bg-red-600 text-white rounded text-sm"
                      onClick={() => removePlatform(platform)}
                    >
                      Remove
                    </button>
                  </div>
                </div>

                {testResults[platform] !== undefined && (
                  <div className={`mb-3 p-2 rounded text-sm ${testResults[platform] ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'}`}>
                    {testResults[platform] ? '✓ Credentials are valid' : '✗ Credentials are invalid'}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {template.fields.map(field => (
                    <div key={field.name} className="relative">
                      <label className="block text-sm text-gray-300 mb-1">
                        {field.placeholder}
                        {field.required && <span className="text-red-400 ml-1">*</span>}
                      </label>
                      <div className="relative">
                        <input
                          type={showPasswords[`${platform}_${field.name}`] ? 'text' : field.type}
                          className="w-full bg-[#0e0e0e] border border-[#333333] rounded px-3 py-2 text-white pr-10"
                          value={platformCreds[field.name] || ''}
                          onChange={(e) => updateCredential(platform, field.name, e.target.value)}
                          placeholder={field.placeholder}
                          required={field.required}
                        />
                        {field.type === 'password' && (
                          <button
                            type="button"
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                            onClick={() => togglePasswordVisibility(platform, field.name)}
                          >
                            {showPasswords[`${platform}_${field.name}`] ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          className="px-6 py-2 bg-[#39FF14] text-black rounded font-medium flex items-center gap-2"
          onClick={handleSave}
          disabled={saving}
        >
          <Save size={16} />
          {saving ? 'Saving...' : 'Save Credentials'}
        </button>
      </div>
    </div>
  );
} 