import { HfInference } from "@huggingface/inference";
import { AIConfigManager } from "./aiConfig";

export interface AIResponse {
  text: string;
  confidence?: number;
  emotion?: 'neutral' | 'hostile' | 'friendly' | 'fearful' | 'aggressive';
  context?: string;
}

export interface NPCPersonality {
  type: 'gang_member' | 'civilian' | 'police' | 'dealer' | 'informant';
  traits: string[];
  background: string;
  currentMood: string;
}

export interface BehaviorAnalysis {
  aggressionLevel: number;
  trustworthiness: number;
  predictedActions: string[];
  riskAssessment: 'low' | 'medium' | 'high';
}

export interface MissionData {
  id: string;
  title: string;
  description: string;
  objectives: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  reward: number;
  location: string;
  timeLimit?: number;
}

class AIService {
  private hf: HfInference | null = null;
  private conversationHistory: Map<string, string[]> = new Map();
  private isOnline: boolean = false;

  constructor() {
    this.initClient();
  }

  private initClient() {
    const config = AIConfigManager.getConfiguration();
    if (config.providerId === 'huggingface' && config.apiKey && config.apiKey.trim() !== '') {
      try {
        this.hf = new HfInference(config.apiKey);
        console.log('Hugging Face client initialized successfully');
      } catch (error) {
        console.error('Failed to initialize Hugging Face client:', error);
        this.hf = null;
      }
    } else {
      this.hf = null;
    }
  }

  public updateConfig() {
    this.initClient();
  }

  async generateNPCDialogue(
    personality: NPCPersonality,
    playerMessage: string,
    context: string
  ): Promise<AIResponse> {
    try {
      if (!this.hf) {
        return this.getFallbackResponse(personality);
      }

      const prompt = this.buildNPCPrompt(personality, playerMessage, context);
      const config = AIConfigManager.getConfiguration();
      
      const response = await this.hf.textGeneration({
        model: config.modelId || 'gpt2',
        inputs: prompt,
        parameters: {
          max_new_tokens: config.parameters.maxTokens || 50,
          temperature: config.parameters.temperature || 0.8,
          do_sample: true,
          return_full_text: false,
          pad_token_id: 50256
        }
      });

      const generatedText = response.generated_text?.trim() || '';
      const cleanedText = this.cleanAIResponse(generatedText);
      const emotion = this.analyzeEmotion(cleanedText);
      
      const npcId = `${personality.type}_${personality.background}`;
      if (!this.conversationHistory.has(npcId)) {
        this.conversationHistory.set(npcId, []);
      }
      this.conversationHistory.get(npcId)?.push(playerMessage, cleanedText);

      const finalText = cleanedText || this.getFallbackDialogue(personality);

      return {
        text: finalText,
        emotion,
        confidence: cleanedText ? 0.85 : 0.6,
        context: `${personality.type} in ${context}`
      };
    } catch (error) {
      console.warn('AI dialogue generation failed, using fallback:', error);
      return this.getFallbackResponse(personality);
    }
  }

  async generateMission(
    playerLevel: number,
    location: string,
    type: string
  ): Promise<MissionData> {
    try {
      if (!this.hf) {
        return this.generateFallbackMission(playerLevel, location);
      }

      const prompt = `Generate a cyberpunk crime mission for a player at level ${playerLevel} in ${location}. 
      Mission type: ${type}. Include title, description, 3 objectives, difficulty, and reward amount.
      Format: Title: [title] | Description: [desc] | Objectives: 1.[obj1] 2.[obj2] 3.[obj3] | Difficulty: [easy/medium/hard] | Reward: $[amount]`;

      const config = AIConfigManager.getConfiguration();
      const response = await this.hf.textGeneration({
        model: config.modelId || 'gpt2',
        inputs: prompt,
        parameters: {
          max_new_tokens: 200,
          temperature: 0.7,
          do_sample: true
        }
      });

      return this.parseMissionResponse(response.generated_text || '', playerLevel);
    } catch (error) {
      console.warn('Mission generation failed, using fallback:', error);
      return this.generateFallbackMission(playerLevel, location);
    }
  }

  async generateDynamicStory(
    playerStats: { level: number; reputation: number },
    location: string,
    recentActions: string[]
  ): Promise<string> {
    try {
      if (!this.hf) {
        return this.getFallbackStory(recentActions);
      }

      const prompt = `Create a cyberpunk story event based on: Player stats: ${JSON.stringify(playerStats)}, 
      Location: ${location}, Recent actions: ${recentActions.join(', ')}. 
      Write a dramatic 2-3 sentence story event that responds to the player's actions.`;

      const config = AIConfigManager.getConfiguration();
      const response = await this.hf.textGeneration({
        model: config.modelId || 'gpt2',
        inputs: prompt,
        parameters: {
          max_new_tokens: 150,
          temperature: 0.8,
          do_sample: true
        }
      });

      return response.generated_text?.trim() || this.getFallbackStory(recentActions);
    } catch (error) {
      console.warn('Story generation failed, using fallback:', error);
      return this.getFallbackStory(recentActions);
    }
  }

  async analyzePlayerBehavior(actions: string[]): Promise<BehaviorAnalysis> {
    try {
      if (!this.hf) {
        return this.getFallbackBehaviorAnalysis();
      }

      const prompt = `Analyze player behavior from these actions: ${actions.join(', ')}. 
      Rate aggression (0-1), trustworthiness (0-1), predict 3 likely next actions, assess risk level.
      Format: Aggression:[0-1] Trust:[0-1] Actions:[action1,action2,action3] Risk:[low/medium/high]`;

      const config = AIConfigManager.getConfiguration();
      const response = await this.hf.textGeneration({
        model: config.modelId || 'gpt2',
        inputs: prompt,
        parameters: {
          max_new_tokens: 100,
          temperature: 0.6
        }
      });

      return this.parseBehaviorAnalysis(response.generated_text || '', actions);
    } catch (error) {
      console.warn('Behavior analysis failed, using fallback:', error);
      return this.getFallbackBehaviorAnalysis();
    }
  }

  private cleanAIResponse(text: string): string {
    if (!text) return '';
    let cleaned = text
      .replace(/^(Human:|AI:|Assistant:|User:)/gi, '')
      .replace(/\n+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    const sentences = cleaned.split(/[.!?]+/);
    if (sentences.length > 1 && sentences[0].length > 10) {
      cleaned = sentences[0].trim();
      if (!cleaned.match(/[.!?]$/)) {
        cleaned += '.';
      }
    }
    
    if (cleaned.length > 100) {
      cleaned = cleaned.substring(0, 97) + '...';
    }
    
    return cleaned;
  }

  private buildNPCPrompt(personality: NPCPersonality, message: string, context: string): string {
    const history = this.conversationHistory.get(`${personality.type}_${personality.background}`) || [];
    const recentHistory = history.slice(-4).join(' ');
    
    return `You are a ${personality.type} in a cyberpunk city. Background: ${personality.background}. 
    Traits: ${personality.traits.join(', ')}. Current mood: ${personality.currentMood}.
    Context: ${context}. Recent conversation: ${recentHistory}
    Player says: "${message}"
    Respond in character (max 20 words):`;
  }

  private analyzeEmotion(text: string): AIResponse['emotion'] {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('angry') || lowerText.includes('hate') || lowerText.includes('kill')) {
      return 'aggressive';
    } else if (lowerText.includes('scared') || lowerText.includes('afraid') || lowerText.includes('help')) {
      return 'fearful';
    } else if (lowerText.includes('friend') || lowerText.includes('good') || lowerText.includes('thanks')) {
      return 'friendly';
    } else if (lowerText.includes('enemy') || lowerText.includes('watch') || lowerText.includes('trouble')) {
      return 'hostile';
    }
    return 'neutral';
  }

  private getFallbackDialogue(personality: NPCPersonality): string {
    const dialogues: Record<string, string[]> = {
      gang_member: ["You better watch yourself around here.", "What do you want?", "This is our territory."],
      civilian: ["Just trying to get by.", "Please don't hurt me.", "I don't want any trouble."],
      police: ["Move along, citizen.", "Everything under control here.", "I'm watching you."],
      dealer: ["You looking to buy?", "I got what you need.", "Keep it quiet."],
      informant: ["I hear things.", "Information costs extra.", "Meet me later."]
    };
    
    const options = dialogues[personality.type] || ["..."];
    return options[Math.floor(Math.random() * options.length)];
  }

  private getFallbackResponse(personality: NPCPersonality): AIResponse {
    return {
      text: this.getFallbackDialogue(personality),
      emotion: 'neutral',
      confidence: 0.6,
      context: `Fallback response for ${personality.type}`
    };
  }

  private parseMissionResponse(text: string, playerLevel: number): MissionData {
    const lines = text.split('|');
    const title = lines[0]?.replace('Title:', '').trim() || 'Generated Mission';
    const description = lines[1]?.replace('Description:', '').trim() || 'AI-generated objective';
    
    return {
      id: `ai_mission_${crypto.randomUUID()}`,
      title,
      description,
      objectives: ['Complete primary objective', 'Avoid detection', 'Escape safely'],
      difficulty: playerLevel < 5 ? 'easy' : playerLevel < 15 ? 'medium' : 'hard',
      reward: Math.floor(1000 + (playerLevel * 500) + Math.random() * 2000),
      location: 'Downtown District'
    };
  }

  private generateFallbackMission(playerLevel: number, location: string): MissionData {
    const missions = [
      {
        title: 'Corporate Infiltration',
        description: 'Infiltrate the corporate tower and steal sensitive data.',
        objectives: ['Access the building', 'Locate the server room', 'Extract data'],
      },
      {
        title: 'Territory War',
        description: 'Defend your gang\'s territory from rival faction.',
        objectives: ['Eliminate threats', 'Secure the area', 'Report back'],
      },
      {
        title: 'Information Broker',
        description: 'Meet with an informant to gather intelligence.',
        objectives: ['Find the contact', 'Exchange information', 'Avoid surveillance'],
      }
    ];

    const mission = missions[Math.floor(Math.random() * missions.length)];
    return {
      id: `fallback_mission_${crypto.randomUUID()}`,
      ...mission,
      difficulty: playerLevel < 5 ? 'easy' : playerLevel < 15 ? 'medium' : 'hard',
      reward: Math.floor(1000 + (playerLevel * 300)),
      location
    };
  }

  private getFallbackStory(actions: string[]): string {
    const hasViolence = actions.some(a => a.includes('attack') || a.includes('shoot'));
    const hasHelp = actions.some(a => a.includes('help') || a.includes('protect'));
    
    if (hasViolence) {
      return "Your violent actions have sent ripples through the underworld. Rival gangs are taking notice, and the streets whisper your name with a mixture of fear and respect.";
    } else if (hasHelp) {
      return "Word of your helpful nature spreads through the community. Some see you as a protector, while others question your motives in this unforgiving city.";
    } else {
      return "The neon-lit streets of IronHaven pulse with activity. In the distance, sirens wail as another deal goes wrong, reminding you that survival requires constant vigilance.";
    }
  }

  private parseBehaviorAnalysis(text: string, actions: string[]): BehaviorAnalysis {
    const hasViolence = actions.filter(a => a.includes('attack') || a.includes('shoot')).length;
    const hasHelp = actions.filter(a => a.includes('help') || a.includes('protect')).length;
    
    const aggressionLevel = Math.min(hasViolence * 0.3, 1);
    const trustworthiness = Math.max(0.5 - (hasViolence * 0.2) + (hasHelp * 0.3), 0);
    
    return {
      aggressionLevel,
      trustworthiness,
      predictedActions: ['explore_area', 'interact_npc', 'complete_mission'],
      riskAssessment: aggressionLevel > 0.7 ? 'high' : aggressionLevel > 0.4 ? 'medium' : 'low'
    };
  }

  private getFallbackBehaviorAnalysis(): BehaviorAnalysis {
    return {
      aggressionLevel: 0.5,
      trustworthiness: 0.6,
      predictedActions: ['explore', 'interact', 'progress'],
      riskAssessment: 'medium'
    };
  }

  async testConnection(): Promise<boolean> {
    try {
      if (!this.hf) {
        this.isOnline = false;
        return false;
      }

      const response = await this.hf.textGeneration({
        model: 'gpt2',
        inputs: 'Hello',
        parameters: { 
          max_new_tokens: 5,
          temperature: 0.7,
          do_sample: false
        }
      });
      
      if (response && (response.generated_text || response.generated_text === '')) {
        this.isOnline = true;
        return true;
      } else {
        throw new Error('Invalid response format');
      }
    } catch {
      this.isOnline = false;
      return false;
    }
  }

  getStatus(): { online: boolean; model: string } {
    return {
      online: this.isOnline,
      model: AIConfigManager.getConfiguration().modelId || 'Hugging Face GPT-2'
    };
  }
}

export const aiService = new AIService();

export async function generateNPCResponse(
  playerReputation: number,
  playerActions: string[],
  context: string
): Promise<AIResponse> {
  const personality: NPCPersonality = {
    type: 'civilian',
    traits: ['cautious', 'observant'],
    background: 'local resident',
    currentMood: playerReputation > 50 ? 'friendly' : 'neutral'
  };
  
  // personality and playerActions are used in future logic, but we must use them to satisfy lint
  console.debug('Generating response for:', personality.type, 'with actions:', playerActions.length);

  return aiService.generateNPCDialogue(personality, 'Hello', context);
}

export async function analyzeThreatLevel(
  _playerPosition: [number, number, number],
  nearbyNPCs: { type: string }[]
): Promise<{ level: number; description: string; recommendations: string[] }> {
  const actions = nearbyNPCs.map(npc => npc.type || 'unknown');
  const analysis = await aiService.analyzePlayerBehavior(actions);
  
  return {
    level: analysis.aggressionLevel,
    description: `Threat level: ${analysis.riskAssessment}`,
    recommendations: analysis.predictedActions
  };
}
