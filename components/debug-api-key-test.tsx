"use client";

import { useState } from 'react';
import { storage } from '@/lib/storage';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

export function DebugApiKeyTest() {
  const [testApiKey, setTestApiKey] = useState('');
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const testStorageFlow = async () => {
    setIsLoading(true);
    setDebugInfo(null);

    try {
      // Test 1: Set API key in localStorage
      if (testApiKey) {
        storage.apiKeys.set('google', testApiKey);
        console.log('✅ Set test API key in localStorage');
      }

      // Test 2: Retrieve API key
      const retrievedKey = storage.apiKeys.get('google');
      console.log('🔍 Retrieved API key:', retrievedKey?.substring(0, 10) + '...');

      // Test 3: Test the debug endpoint
      const debugResponse = await fetch('/api/debug', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          googleApiKey: retrievedKey,
          selectedChatModel: 'gemini-2.0-flash',
          test: true
        })
      });

      const debugResult = await debugResponse.json();
      console.log('🔍 Debug endpoint response:', debugResult);

      setDebugInfo({
        localStorage: {
          hasKey: !!retrievedKey,
          keyLength: retrievedKey?.length || 0,
          keyPrefix: retrievedKey?.substring(0, 10) || 'none'
        },
        debugEndpoint: debugResult,
        storageHealth: storage.general.checkHealth()
      });

    } catch (error) {
      console.error('💥 Test failed:', error);
      setDebugInfo({
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const clearApiKey = () => {
    storage.apiKeys.remove('google');
    setDebugInfo(null);
    console.log('🗑️ Cleared Google API key');
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>🔍 API Key Debug Test</CardTitle>
        <CardDescription>
          Test the API key storage and retrieval flow
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Enter test API key (AIzaSy...)"
            value={testApiKey}
            onChange={(e) => setTestApiKey(e.target.value)}
            type="password"
          />
          <Button onClick={testStorageFlow} disabled={isLoading}>
            {isLoading ? 'Testing...' : 'Test Flow'}
          </Button>
          <Button variant="outline" onClick={clearApiKey}>
            Clear Key
          </Button>
        </div>

        {debugInfo && (
          <div className="mt-4">
            <h3 className="font-semibold mb-2">Debug Results:</h3>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>
        )}

        <div className="text-sm text-gray-600">
          <p><strong>Instructions:</strong></p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Enter a test Google API key (starts with AIzaSy...)</li>
            <li>Click "Test Flow" to test localStorage and API communication</li>
            <li>Check the browser console for detailed logs</li>
            <li>Try sending a chat message after setting the key</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}