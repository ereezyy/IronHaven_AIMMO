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
  
  // If no code block, use regex to find the first complete JSON object
  const jsonMatch = text.match(/(\{[\s\S]*?\})/);
  if (jsonMatch) {
    return jsonMatch[1];
  }
  
  // Fallback: try to find JSON between first and last braces
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
    // Use fallback logic instead of API call due to API key issues
    return generateFallbackNPCResponse(playerReputation, playerActions, context);
  } catch (error) {
    console.error('Error generating NPC response:', error);
    return generateFallbackNPCResponse(playerReputation, playerActions, context);
  }
}

function generateFallbackNPCResponse(
  playerReputation: number,
  playerActions: string[],
  context: string
): NPCBehavior {
  // Generate contextual responses based on reputation and actions
  const hasHostileActions = playerActions.some(action => 
    action.includes('attack') || action.includes('shoot') || action.includes('kill')
  );
  
  const hasHelpfulActions = playerActions.some(action =>
    action.includes('help') || action.includes('protect') || action.includes('heal')
  );
  
  let mood: 'hostile' | 'neutral' | 'friendly' = 'neutral';
  let dialogue = "...";
  let action = "stand_guard";
  
  if (playerReputation < 30 || hasHostileActions) {
    mood = 'hostile';
    dialogue = Math.random() > 0.5 ? 
      "You better watch yourself around here." : 
      "I don't like the look of you.";
    action = Math.random() > 0.7 ? "flee" : "watch_suspiciously";
  } else if (playerReputation > 70 || hasHelpfulActions) {
    mood = 'friendly';
    dialogue = Math.random() > 0.5 ?
      "Good to see someone looking out for the neighborhood." :
      "You're alright in my book.";
    action = "greet";
  } else {
    dialogue = Math.random() > 0.5 ?
      "Just minding my own business." :
      "Another day in Ironhaven.";
  }
  
  return {
    dialogue,
    action,
    mood,
    memory: [`Met player with reputation ${playerReputation}`, ...playerActions.slice(-2)]
  };
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
    };
  }
}