import React, { useState, useEffect } from 'react';
import { aiService } from '../lib/ai';
import AIConfigPanel from './AIConfigPanel';
import { AIConfigManager } from '../lib/aiConfig';

interface AIStatusProps {
  className?: string;
}

const AIStatusDisplay: React.FC<AIStatusProps> = ({ className = '' }) => {
  const [aiStatus, setAiStatus] = useState({ online: false, model: 'Checking...' });
  const [isVisible, setIsVisible] = useState(true);
  const [testResults, setTestResults] = useState<string[]>([]);
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [currentConfig, setCurrentConfig] = useState(AIConfigManager.getConfiguration());

  useEffect(() => {
    const checkAIStatus = async () => {
      try {
        const isOnline = await aiService.testConnection();
        const status = aiService.getStatus();
        setAiStatus({ ...status, online: isOnline });
        
        if (isOnline) {
          setTestResults(prev => [...prev, `✅ AI Connected: ${new Date().toLocaleTimeString()}`]);
        } else {
          setTestResults(prev => [...prev, `⚠️ AI Fallback Mode: ${new Date().toLocaleTimeString()}`]);
        }
      } catch (error) {
        setAiStatus({ online: false, model: 'Connection Failed' });
        setTestResults(prev => [...prev, `❌ AI Error: ${new Date().toLocaleTimeString()}`]);
      }
    };

    checkAIStatus();
    const interval = setInterval(checkAIStatus, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const runAIDemo = async () => {
    setTestResults(prev => [...prev, '🧠 Running AI Demo...']);
    
    try {
      // Test NPC dialogue generation
      const npcResponse = await aiService.generateNPCDialogue(
        {
          type: 'gang_member',
          traits: ['aggressive', 'territorial'],
          background: 'street enforcer',
          currentMood: 'suspicious'
        },
        'What are you doing here?',
        'dark alley'
      );
      
      setTestResults(prev => [...prev, `💬 NPC: "${npcResponse.text}" (${npcResponse.emotion})`]);

      // Test mission generation
      const mission = await aiService.generateMission(5, 'Downtown', 'heist');
      setTestResults(prev => [...prev, `🎯 Mission: "${mission.title}" - $${mission.reward}`]);

      // Test story generation
      const story = await aiService.generateDynamicStory(
        { level: 5, reputation: 60 },
        'Neon District',
        ['explored_area', 'talked_to_npc']
      );
      setTestResults(prev => [...prev, `📖 Story: "${story.substring(0, 50)}..."`]);

    } catch (error) {
      setTestResults(prev => [...prev, `❌ Demo failed: ${error}`]);
    }
  };

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed top-4 right-4 bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-sm z-50"
      >
        Show AI Status
      </button>
    );
  }

  return (
    <div className={`fixed top-4 right-4 bg-black/90 border border-purple-500 rounded-lg p-4 max-w-sm z-50 ${className}`}>
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-purple-400 font-bold text-sm">🤖 AI System Status</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-white text-xs"
        >
          ✕
        </button>
      </div>
      
      <div className="space-y-2 text-xs">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${aiStatus.online ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-white">
            {aiStatus.online ? 'Online' : 'Offline'} - {aiStatus.model}
          </span>
        </div>
        
        <button
          onClick={runAIDemo}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white py-1 px-2 rounded text-xs"
        >
          🧠 Run AI Demo
        </button>
        
        <button
          onClick={() => setShowConfigPanel(true)}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-1 px-2 rounded text-xs"
        >
          ⚙️ AI Settings
        </button>
        
        <div className="max-h-32 overflow-y-auto space-y-1">
          {testResults.slice(-5).map((result, index) => (
            <div key={index} className="text-gray-300 text-xs break-words">
              {result}
            </div>
          ))}
        </div>
        
        {testResults.length > 0 && (
          <button
            onClick={() => setTestResults([])}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white py-1 px-2 rounded text-xs"
          >
            Clear Log
          </button>
        )}
      </div>
      
      <AIConfigPanel
        isOpen={showConfigPanel}
        onClose={() => setShowConfigPanel(false)}
        onConfigChange={(config) => {
          setCurrentConfig(config);
          setTestResults(prev => [...prev, `⚙️ Configuration updated: ${config.providerId}/${config.modelId}`]);
        }}
      />
    </div>
  );
};

export default AIStatusDisplay;

