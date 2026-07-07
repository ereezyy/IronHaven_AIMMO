import { HfInference } from '@huggingface/inference';
import { llmClient } from './llmClient';

// Initialize Hugging Face client with better token handling
const getHfToken = () => {
  // Try different environment variable approaches
  const token =
    process.env.REACT_APP_HUGGING_FACE_TOKEN ||
    import.meta.env.VITE_HUGGING_FACE_TOKEN ||
    (window as any).HUGGING_FACE_TOKEN ||
    'YOUR_HUGGING_FACE_TOKEN_HERE'; // Placeholder - replace with your token

  console.log(
    'AI Token Status:',
    token && token !== 'YOUR_HUGGING_FACE_TOKEN_HERE'
      ? 'Token found'
      : 'No token'
  );
  return token;
};

let hf: HfInference;
try {
  hf = new HfInference(getHfToken());
  console.log('Hugging Face client initialized successfully');
} catch (error) {
  console.error('Failed to initialize Hugging Face client:', error);
}

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
  private conversationHistory: Map<string, string[]> = new Map();
  private isOnline: boolean = true;

  async generateNPCDialogue(
    personality: NPCPersonality,
    playerMessage: string,
    context: string,
    memoryContext: string = ''
  ): Promise<AIResponse> {
    const npcId = `${personality.type}_${personality.background}`;
    try {
      // Preferred path: the configured modern LLM. memoryContext lets the NPC
      // react to who the player is to *them* (past encounters, sentiment).
      if (llmClient.isConfigured()) {
        const system = this.buildNPCSystemPrompt(personality, memoryContext);
        const history = (this.conversationHistory.get(npcId) || [])
          .slice(-4)
          .join('\n');
        const user =
          `${context ? `Scene: ${context}\n` : ''}` +
          `${history ? `Recent exchange:\n${history}\n` : ''}` +
          `Player says: "${playerMessage}"\n` +
          `Reply in character, one or two sentences, no narration.`;
        const llmText = await llmClient.complete(system, user, {
          maxTokens: 80,
        });
        if (llmText) {
          const cleaned = this.cleanAIResponse(llmText);
          this.rememberExchange(npcId, playerMessage, cleaned);
          return {
            text: cleaned || this.getFallbackDialogue(personality),
            emotion: this.analyzeEmotion(cleaned, personality),
            confidence: 0.92,
            context: `${personality.type} in ${context}`,
          };
        }
      }

      if (!hf) {
        return this.getFallbackResponse(personality, playerMessage, context);
      }

      const prompt = this.buildNPCPrompt(
        personality,
        playerMessage,
        context,
        memoryContext
      );

      const response = await hf.textGeneration({
        model: 'gpt2',
        inputs: prompt,
        parameters: {
          max_new_tokens: 50,
          temperature: 0.8,
          do_sample: true,
          return_full_text: false,
          pad_token_id: 50256,
        },
      });

      const generatedText = response.generated_text?.trim() || '';
      const cleanedText = this.cleanAIResponse(generatedText);
      const emotion = this.analyzeEmotion(cleanedText, personality);

      this.rememberExchange(npcId, playerMessage, cleanedText);

      const finalText = cleanedText || this.getFallbackDialogue(personality);

      return {
        text: finalText,
        emotion,
        confidence: cleanedText ? 0.85 : 0.6,
        context: `${personality.type} in ${context}`,
      };
    } catch (error) {
      console.warn('AI dialogue generation failed, using fallback:', error);
      return this.getFallbackResponse(personality, playerMessage, context);
    }
  }

  // Records a player/NPC turn in the in-memory conversation buffer so the next
  // reply has short-term continuity (long-term memory is handled separately by
  // the persistent playerMemory service).
  private rememberExchange(npcId: string, player: string, npc: string): void {
    if (!this.conversationHistory.has(npcId)) {
      this.conversationHistory.set(npcId, []);
    }
    this.conversationHistory
      .get(npcId)
      ?.push(`Player: ${player}`, `${npcId}: ${npc}`);
  }

  private buildNPCSystemPrompt(
    personality: NPCPersonality,
    memoryContext: string
  ): string {
    return (
      `You are a ${personality.type.replace('_', ' ')} in IronHaven, a ` +
      `neon-soaked cyberpunk city ruled by gangs and corporations. ` +
      `Background: ${personality.background}. ` +
      `Personality traits: ${personality.traits.join(', ')}. ` +
      `Current mood: ${personality.currentMood}.` +
      (memoryContext
        ? ` What you remember about this person: ${memoryContext}`
        : '') +
      ` Stay fully in character, gritty and terse. Never break character or ` +
      `mention being an AI.`
    );
  }

  async generateMission(
    playerLevel: number,
    location: string,
    type: string,
    directorContext: string = ''
  ): Promise<MissionData> {
    const difficulty =
      playerLevel < 5 ? 'easy' : playerLevel < 15 ? 'medium' : 'hard';
    try {
      // Preferred path: structured JSON from the configured LLM. directorContext
      // lets the AI Director thread this mission into the player's personal arc.
      if (llmClient.isConfigured()) {
        const system =
          'You are the mission designer for IronHaven, a cyberpunk crime MMO. ' +
          'Return ONLY a JSON object with keys: title (string), description ' +
          '(2 sentences), objectives (array of exactly 3 short strings), ' +
          'difficulty ("easy"|"medium"|"hard"), reward (integer dollars).';
        const user =
          `Player level: ${playerLevel}. District: ${location}. ` +
          `Mission type: ${type}. Target difficulty: ${difficulty}.` +
          (directorContext ? ` Story context: ${directorContext}` : '');
        const parsed = await llmClient.completeJSON<Partial<MissionData>>(
          system,
          user,
          { maxTokens: 400 }
        );
        if (parsed?.title && parsed.description) {
          return {
            id: `ai_mission_${crypto.randomUUID()}`,
            title: parsed.title,
            description: parsed.description,
            objectives:
              Array.isArray(parsed.objectives) && parsed.objectives.length
                ? parsed.objectives.slice(0, 3)
                : ['Complete the objective', 'Avoid detection', 'Escape'],
            difficulty: parsed.difficulty || difficulty,
            reward:
              typeof parsed.reward === 'number'
                ? parsed.reward
                : Math.floor(1000 + playerLevel * 500 + Math.random() * 2000),
            location,
          };
        }
      }

      if (!hf) return this.generateFallbackMission(playerLevel, location, type);

      const prompt = `Generate a cyberpunk crime mission for a player at level ${playerLevel} in ${location}.
      Mission type: ${type}. Include title, description, 3 objectives, difficulty, and reward amount.
      Format: Title: [title] | Description: [desc] | Objectives: 1.[obj1] 2.[obj2] 3.[obj3] | Difficulty: [easy/medium/hard] | Reward: $[amount]`;

      const response = await hf.textGeneration({
        model: 'gpt2',
        inputs: prompt,
        parameters: {
          max_new_tokens: 200,
          temperature: 0.7,
          do_sample: true,
        },
      });

      return this.parseMissionResponse(
        response.generated_text || '',
        playerLevel
      );
    } catch (error) {
      console.warn('Mission generation failed, using fallback:', error);
      return this.generateFallbackMission(playerLevel, location, type);
    }
  }

  async generateDynamicStory(
    playerStats: any,
    location: string,
    recentActions: string[]
  ): Promise<string> {
    try {
      if (llmClient.isConfigured()) {
        const system =
          'You are the narrator of IronHaven, a cyberpunk crime MMO. Write a ' +
          'vivid, dramatic 2-3 sentence world event reacting to the player. ' +
          'Second person. No preamble, no quotes.';
        const user =
          `Player stats: ${JSON.stringify(playerStats)}. Location: ${location}. ` +
          `Recent actions: ${recentActions.join(', ') || 'none'}.`;
        const text = await llmClient.complete(system, user, { maxTokens: 160 });
        if (text) return text.trim();
      }

      if (!hf) return this.getFallbackStory(recentActions);

      const prompt = `Create a cyberpunk story event based on: Player stats: ${JSON.stringify(playerStats)},
      Location: ${location}, Recent actions: ${recentActions.join(', ')}.
      Write a dramatic 2-3 sentence story event that responds to the player's actions.`;

      const response = await hf.textGeneration({
        model: 'gpt2',
        inputs: prompt,
        parameters: {
          max_new_tokens: 150,
          temperature: 0.8,
        },
      });

      return (
        response.generated_text?.trim() || this.getFallbackStory(recentActions)
      );
    } catch (error) {
      console.warn('Story generation failed, using fallback:', error);
      return this.getFallbackStory(recentActions);
    }
  }

  async analyzePlayerBehavior(actions: string[]): Promise<BehaviorAnalysis> {
    try {
      const prompt = `Analyze player behavior from these actions: ${actions.join(', ')}. 
      Rate aggression (0-1), trustworthiness (0-1), predict 3 likely next actions, assess risk level.
      Format: Aggression:[0-1] Trust:[0-1] Actions:[action1,action2,action3] Risk:[low/medium/high]`;

      const response = await hf.textGeneration({
        model: 'gpt2',
        inputs: prompt,
        parameters: {
          max_new_tokens: 100,
          temperature: 0.6,
        },
      });

      return this.parseBehaviorAnalysis(response.generated_text || '', actions);
    } catch (error) {
      console.warn('Behavior analysis failed, using fallback:', error);
      return this.getFallbackBehaviorAnalysis(actions);
    }
  }

  private cleanAIResponse(text: string): string {
    if (!text) return '';

    // Remove common AI artifacts and clean up the response
    let cleaned = text
      .replace(/^(Human:|AI:|Assistant:|User:)/gi, '') // Remove role prefixes
      .replace(/\n+/g, ' ') // Replace newlines with spaces
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    // Take only the first sentence if multiple sentences
    const sentences = cleaned.split(/[.!?]+/);
    if (sentences.length > 1 && sentences[0].length > 10) {
      cleaned = sentences[0].trim();
      if (!cleaned.match(/[.!?]$/)) {
        cleaned += '.';
      }
    }

    // Ensure reasonable length
    if (cleaned.length > 100) {
      cleaned = cleaned.substring(0, 97) + '...';
    }

    return cleaned;
  }

  private buildNPCPrompt(
    personality: NPCPersonality,
    message: string,
    context: string,
    memoryContext: string = ''
  ): string {
    const history =
      this.conversationHistory.get(
        `${personality.type}_${personality.background}`
      ) || [];
    const recentHistory = history.slice(-4).join(' ');

    return `You are a ${personality.type} in a cyberpunk city. Background: ${personality.background}.
    Traits: ${personality.traits.join(', ')}. Current mood: ${personality.currentMood}.
    ${memoryContext ? `Memory of this person: ${memoryContext}.` : ''}
    Context: ${context}. Recent conversation: ${recentHistory}
    Player says: "${message}"
    Respond in character (max 20 words):`;
  }

  private analyzeEmotion(
    text: string,
    personality: NPCPersonality
  ): AIResponse['emotion'] {
    const lowerText = text.toLowerCase();

    if (
      lowerText.includes('angry') ||
      lowerText.includes('hate') ||
      lowerText.includes('kill')
    ) {
      return 'aggressive';
    } else if (
      lowerText.includes('scared') ||
      lowerText.includes('afraid') ||
      lowerText.includes('help')
    ) {
      return 'fearful';
    } else if (
      lowerText.includes('friend') ||
      lowerText.includes('good') ||
      lowerText.includes('thanks')
    ) {
      return 'friendly';
    } else if (
      lowerText.includes('enemy') ||
      lowerText.includes('watch') ||
      lowerText.includes('trouble')
    ) {
      return 'hostile';
    }

    return 'neutral';
  }

  private getFallbackDialogue(personality: NPCPersonality): string {
    const dialogues = {
      gang_member: [
        'You better watch yourself around here.',
        'What do you want?',
        'This is our territory.',
      ],
      civilian: [
        'Just trying to get by.',
        "Please don't hurt me.",
        "I don't want any trouble.",
      ],
      police: [
        'Move along, citizen.',
        'Everything under control here.',
        "I'm watching you.",
      ],
      dealer: ['You looking to buy?', 'I got what you need.', 'Keep it quiet.'],
      informant: [
        'I hear things.',
        'Information costs extra.',
        'Meet me later.',
      ],
    };

    const options = dialogues[personality.type] || ['...'];
    return options[Math.floor(Math.random() * options.length)];
  }

  private getFallbackResponse(
    personality: NPCPersonality,
    message: string,
    context: string
  ): AIResponse {
    return {
      text: this.getFallbackDialogue(personality),
      emotion: 'neutral',
      confidence: 0.6,
      context: `Fallback response for ${personality.type}`,
    };
  }

  private parseMissionResponse(text: string, playerLevel: number): MissionData {
    // Simple parsing logic for AI-generated missions
    const lines = text.split('|');
    const title = lines[0]?.replace('Title:', '').trim() || 'Generated Mission';
    const description =
      lines[1]?.replace('Description:', '').trim() || 'AI-generated objective';

    return {
      id: crypto.randomUUID(),
      title,
      description,
      objectives: [
        'Complete primary objective',
        'Avoid detection',
        'Escape safely',
      ],
      difficulty:
        playerLevel < 5 ? 'easy' : playerLevel < 15 ? 'medium' : 'hard',
      reward: Math.floor(1000 + playerLevel * 500 + Math.random() * 2000),
      location: 'Downtown District',
    };
  }

  private generateFallbackMission(
    playerLevel: number,
    location: string,
    type: string
  ): MissionData {
    const missions = [
      {
        title: 'Corporate Infiltration',
        description: 'Infiltrate the corporate tower and steal sensitive data.',
        objectives: [
          'Access the building',
          'Locate the server room',
          'Extract data',
        ],
      },
      {
        title: 'Territory War',
        description: "Defend your gang's territory from rival faction.",
        objectives: ['Eliminate threats', 'Secure the area', 'Report back'],
      },
      {
        title: 'Information Broker',
        description: 'Meet with an informant to gather intelligence.',
        objectives: [
          'Find the contact',
          'Exchange information',
          'Avoid surveillance',
        ],
      },
    ];

    const mission = missions[Math.floor(Math.random() * missions.length)];

    return {
      id: crypto.randomUUID(),
      ...mission,
      difficulty:
        playerLevel < 5 ? 'easy' : playerLevel < 15 ? 'medium' : 'hard',
      reward: Math.floor(1000 + playerLevel * 300),
      location,
    };
  }

  private getFallbackStory(actions: string[]): string {
    const hasViolence = actions.some(
      (a) => a.includes('attack') || a.includes('shoot')
    );
    const hasHelp = actions.some(
      (a) => a.includes('help') || a.includes('protect')
    );

    if (hasViolence) {
      return 'Your violent actions have sent ripples through the underworld. Rival gangs are taking notice, and the streets whisper your name with a mixture of fear and respect.';
    } else if (hasHelp) {
      return 'Word of your helpful nature spreads through the community. Some see you as a protector, while others question your motives in this unforgiving city.';
    } else {
      return 'The neon-lit streets of IronHaven pulse with activity. In the distance, sirens wail as another deal goes wrong, reminding you that survival requires constant vigilance.';
    }
  }

  private parseBehaviorAnalysis(
    text: string,
    actions: string[]
  ): BehaviorAnalysis {
    // Simple parsing with fallback logic
    const hasViolence = actions.filter(
      (a) => a.includes('attack') || a.includes('shoot')
    ).length;
    const hasHelp = actions.filter(
      (a) => a.includes('help') || a.includes('protect')
    ).length;

    const aggressionLevel = Math.min(hasViolence * 0.3, 1);
    const trustworthiness = Math.max(
      0.5 - hasViolence * 0.2 + hasHelp * 0.3,
      0
    );

    return {
      aggressionLevel,
      trustworthiness,
      predictedActions: ['explore_area', 'interact_npc', 'complete_mission'],
      riskAssessment:
        aggressionLevel > 0.7
          ? 'high'
          : aggressionLevel > 0.4
            ? 'medium'
            : 'low',
    };
  }

  private getFallbackBehaviorAnalysis(actions: string[]): BehaviorAnalysis {
    return {
      aggressionLevel: 0.5,
      trustworthiness: 0.6,
      predictedActions: ['explore', 'interact', 'progress'],
      riskAssessment: 'medium',
    };
  }

  // Public method to check if AI is working
  async testConnection(): Promise<boolean> {
    try {
      console.log('Testing Hugging Face connection...');

      if (!hf) {
        console.error('Hugging Face client not initialized');
        this.isOnline = false;
        return false;
      }

      // Use a simpler, more reliable model for testing
      const response = await hf.textGeneration({
        model: 'gpt2',
        inputs: 'Hello',
        parameters: {
          max_new_tokens: 5,
          temperature: 0.7,
          do_sample: false,
        },
      });

      if (import.meta.env.DEV) {
        console.log('AI Test Response:', response);
      }

      if (
        response &&
        (response.generated_text || response.generated_text === '')
      ) {
        this.isOnline = true;
        console.log('✅ Hugging Face AI connection successful');
        return true;
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('❌ Hugging Face AI connection failed:', error);
      this.isOnline = false;
      return false;
    }
  }

  getStatus(): { online: boolean; model: string } {
    return {
      online: this.isOnline,
      model: 'Hugging Face GPT-2/DialoGPT',
    };
  }
}

// Export singleton instance
export const aiService = new AIService();

// Legacy exports for compatibility
export async function generateNPCResponse(
  playerReputation: number,
  playerActions: string[],
  context: string
): Promise<any> {
  const personality: NPCPersonality = {
    type: 'civilian',
    traits: ['cautious', 'observant'],
    background: 'local resident',
    currentMood: playerReputation > 50 ? 'friendly' : 'neutral',
  };

  return aiService.generateNPCDialogue(personality, 'Hello', context);
}

export async function analyzeThreatLevel(
  playerPosition: [number, number, number],
  nearbyNPCs: any[]
): Promise<any> {
  const actions = nearbyNPCs.map((npc) => npc.type || 'unknown');
  const analysis = await aiService.analyzePlayerBehavior(actions);

  return {
    level: analysis.aggressionLevel,
    description: `Threat level: ${analysis.riskAssessment}`,
    recommendations: analysis.predictedActions,
  };
}
