import React, { useEffect, useState } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 
  (process.env.NODE_ENV === 'production' 
    ? 'https://chat.apextsgroup.com/api'
    : 'http://localhost:5000/api');

interface AISettings {
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  enableHandoff: boolean;
  handoffKeywords: string;
}

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<AISettings>({
    systemPrompt: 'You are a helpful assistant.',
    temperature: 0.7,
    maxTokens: 500,
    enableHandoff: true,
    handoffKeywords: 'speak to human, agent, representative',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${API_URL}/settings`);
      setSettings(response.data);
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      await axios.post(`${API_URL}/settings`, settings);
      setMessage({ type: 'success', text: 'Settings saved successfully!' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof AISettings, value: any) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">AI Chat Settings</h1>
        <p className="mt-2 text-sm text-gray-600">
          Configure your AI chatbot behavior and responses
        </p>
      </div>

      <form onSubmit={handleSave} className="bg-white shadow rounded-lg p-6">
        {message && (
          <div
            className={`mb-6 rounded-md p-4 ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800'
                : 'bg-red-50 text-red-800'
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="space-y-6">
          <div>
            <label htmlFor="systemPrompt" className="block text-sm font-medium text-gray-700">
              System Prompt
            </label>
            <textarea
              id="systemPrompt"
              rows={4}
              value={settings.systemPrompt}
              onChange={(e) => handleChange('systemPrompt', e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Enter the system prompt for the AI..."
            />
            <p className="mt-2 text-sm text-gray-500">
              This defines the AI's personality and behavior
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="temperature" className="block text-sm font-medium text-gray-700">
                Temperature: {settings.temperature}
              </label>
              <input
                type="range"
                id="temperature"
                min="0"
                max="1"
                step="0.1"
                value={settings.temperature}
                onChange={(e) => handleChange('temperature', parseFloat(e.target.value))}
                className="mt-1 block w-full"
              />
              <p className="mt-2 text-sm text-gray-500">
                Controls randomness (0 = focused, 1 = creative)
              </p>
            </div>

            <div>
              <label htmlFor="maxTokens" className="block text-sm font-medium text-gray-700">
                Max Tokens
              </label>
              <input
                type="number"
                id="maxTokens"
                min="50"
                max="2000"
                value={settings.maxTokens}
                onChange={(e) => handleChange('maxTokens', parseInt(e.target.value))}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
              <p className="mt-2 text-sm text-gray-500">
                Maximum length of AI responses
              </p>
            </div>
          </div>

          <div>
            <div className="flex items-center">
              <input
                id="enableHandoff"
                type="checkbox"
                checked={settings.enableHandoff}
                onChange={(e) => handleChange('enableHandoff', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="enableHandoff" className="ml-2 block text-sm text-gray-900">
                Enable Human Handoff
              </label>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Allow the AI to transfer conversations to human agents
            </p>
          </div>

          <div>
            <label htmlFor="handoffKeywords" className="block text-sm font-medium text-gray-700">
              Handoff Keywords
            </label>
            <input
              type="text"
              id="handoffKeywords"
              value={settings.handoffKeywords}
              onChange={(e) => handleChange('handoffKeywords', e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="speak to human, agent, representative"
            />
            <p className="mt-2 text-sm text-gray-500">
              Comma-separated keywords that trigger human handoff
            </p>
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Settings;

