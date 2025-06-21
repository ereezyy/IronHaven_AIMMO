import axios from 'axios';

const OPENROUTER_API_KEY = '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';
const XAI_API_KEY = 'xai-S4xZDNinij49ENR8lblSCSg8ZY6FmoFLRPmFwbkfY4UzkoMzYN2qtnx6lQMm85qpPTWC2PIcfz8IPlgp';
const LLAMA_API_KEY = 'LLM|4100880160142288|fWdc0NWI_X21ZYsJKAXY9ciXqhg';

interface NPCBehavior {
  dialogue: string;
  action: string;
  mood: 'hostile' | 'neutral' | 'friendly';
  memory?: string[];
}

interface ThreatAnalysis {
  level: number;
  description: string;
  recommendations: string[];
}

function extractJSON(text: string): string {
  // First, try to find JSON within markdown code blocks
  const codeBlockMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1];
  }
  
  // If no code block, find the first { and last } to extract JSON
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return text.substring(firstBrace, lastBrace + 1);
  }
  
  // If no braces found, return the original text
  return text;
}

export async function generateNPCResponse(
  playerReputation: number,
  playerActions: string[],
  context: string
): Promise<NPCBehavior> {
  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'mistralai/mixtral-8x7b-instruct',
        messages: [
          {
            role: 'system',
            content: `You are an NPC AI in a gritty crime game set in Ironhaven. Generate realistic, context-aware responses based on:
            - Player reputation: ${playerReputation}/100
            - Recent actions: ${playerActions.join(', ')}
            - Location context: ${context}
            
            Response must be JSON with:
            - dialogue: Realistic street dialogue
            - action: Current behavior (flee, attack, negotiate, etc.)
            - mood: hostile/neutral/friendly
            - memory: Array of key events to remember
            
            Keep dialogue gritty and authentic to a crime-ridden city. NPCs should remember past interactions.
            
            IMPORTANT: Return ONLY valid JSON, no additional text or formatting.`
          },
          {
            role: 'user',
            content: `Context: ${context}\nPlayer recent actions: ${playerActions.join(', ')}`
          }
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const rawContent = response.data.choices[0].message.content;
    const jsonString = extractJSON(rawContent);
    const npcResponse = JSON.parse(jsonString);
    
    return {
      dialogue: npcResponse.dialogue || "...",
      action: npcResponse.action || "stand_guard",
      mood: npcResponse.mood || "neutral",
      memory: npcResponse.memory || []
    };
  } catch (error) {
    console.error('Error generating NPC response:', error);
    return {
      dialogue: "...",
      action: "stand_guard",
      mood: "neutral",
      memory: []
    };
  }
}

export async function analyzeThreatLevel(
  playerPosition: [number, number, number],
  nearbyNPCs: any[]
): Promise<ThreatAnalysis> {
  // Use local threat analysis logic instead of external API
  const npcCount = nearbyNPCs?.length || 0;
  const timeOfDay = new Date().getHours();
  
  // Calculate threat level based on NPC count and time of day
  let baseThreat = Math.min(npcCount * 0.2, 1);
  
  // Increase threat at night (10 PM to 6 AM)
  if (timeOfDay >= 22 || timeOfDay <= 6) {
    baseThreat *= 1.3;
  }
  
  // Cap threat level at 1.0
  const threatLevel = Math.min(baseThreat, 1);
  
  let description = `${npcCount} NPCs nearby`;
  if (timeOfDay >= 22 || timeOfDay <= 6) {
    description += " (nighttime - increased danger)";
  }
  
  const recommendations = [];
  if (threatLevel > 0.7) {
    recommendations.push("High threat area - consider avoiding");
    recommendations.push("Find alternative route");
  } else if (threatLevel > 0.4) {
    recommendations.push("Moderate threat - proceed with caution");
    recommendations.push("Stay alert for hostile behavior");
  } else {
    recommendations.push("Low threat area");
    recommendations.push("Maintain situational awareness");
  }
  
  recommendations.push("Watch for escape routes");
  
  return {
    level: threatLevel,
    description,
    recommendations
  };
}

export async function generateDynamicMission(): Promise<any> {
  try {
    const response = await axios.post(
      'https://api.llama.com/v1/chat/completions',
      {
        model: "Llama-4-Maverick-17B-Instruct-FP8",
        messages: [
          {
            role: 'system',
            content: `Generate a dynamic mission for Ironhaven. Include:
            - Mission type (heist, assassination, protection, etc.)
            - Target details
            - Location in Ironhaven
            - Potential complications
            - Reward and risks
            Format as JSON.`
          }
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${LLAMA_API_KEY}`
        }
      }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('Error generating mission:', error);
    return {
      type: "protection",
      target: "Local business owner",
      location: "Downtown Ironhaven",
      complications: ["Rival gang presence"],
      reward: 1000,
      risk_level: "medium"
    };
  }
}

export async function generateMissionOutcome(
  playerChoices: string[],
  playerStats: any,
  missionContext: any
): Promise<any> {
  try {
    const response = await axios.post(
      'https://api.llama.com/v1/chat/completions',
      {
        model: "Llama-4-Maverick-17B-Instruct-FP8",
        messages: [
          {
            role: 'system',
            content: `Generate a detailed mission outcome for Ironhaven based on:
            - Player choices: ${playerChoices.join(', ')}
            - Player stats: ${JSON.stringify(playerStats)}
            - Mission context: ${JSON.stringify(missionContext)}
            
            Include:
            - Immediate consequences
            - Impact on reputation
            - NPC reactions
            - Future implications
            Format as JSON.`
          }
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${LLAMA_API_KEY}`
        }
      }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('Error generating mission outcome:', error);
    return {
      outcome: "Mission completed with complications",
      reputation_change: -5,
      consequences: ["Local gang tensions increased"],
      future_implications: ["Expect retaliation"]
    }
  }
}