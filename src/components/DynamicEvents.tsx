import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameState';
import { AlertTriangle, Clock, Users, Car } from 'lucide-react';

interface DynamicEvent {
  id: string;
  title: string;
  description: string;
  type: 'gang_war' | 'police_raid' | 'street_race' | 'drug_bust' | 'civilian_incident';
  location: [number, number, number];
  radius: number;
  duration: number;
  startTime: number;
  severity: number;
  participants: string[];
  playerInvolved: boolean;
}

interface DynamicEventsProps {
  playerPosition: [number, number, number];
  onEventTriggered: (event: DynamicEvent) => void;
}

const DynamicEvents: React.FC<DynamicEventsProps> = ({ playerPosition, onEventTriggered }) => {
  const gameStore = useGameStore();
  const [activeEvents, setActiveEvents] = useState<DynamicEvent[]>([]);
  const [eventNotifications, setEventNotifications] = useState<DynamicEvent[]>([]);

  // Generate random events based on various factors
  const generateRandomEvent = (): DynamicEvent | null => {
    const eventTypes: DynamicEvent['type'][] = ['gang_war', 'police_raid', 'street_race', 'drug_bust', 'civilian_incident'];
    const type = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    
    // Different events have different spawn probabilities
    let spawnChance = 0.1;
    
    switch (type) {
      case 'gang_war':
        spawnChance = gameStore.playerStats.wanted > 2 ? 0.3 : 0.1;
        break;
      case 'police_raid':
        spawnChance = gameStore.playerStats.wanted > 3 ? 0.4 : 0.05;
        break;
      case 'street_race':
        spawnChance = 0.15;
        break;
      case 'drug_bust':
        spawnChance = 0.2;
        break;
      case 'civilian_incident':
        spawnChance = 0.25;
        break;
    }
    
    if (Math.random() > spawnChance) return null;

    // Generate event location near player but not too close
    const angle = Math.random() * Math.PI * 2;
    const distance = 20 + Math.random() * 40;
    const x = playerPosition[0] + Math.cos(angle) * distance;
    const z = playerPosition[2] + Math.sin(angle) * distance;

    const event: DynamicEvent = {
      id: `event_${Date.now()}`,
      title: getEventTitle(type),
      description: getEventDescription(type),
      type,
      location: [x, 1, z],
      radius: getEventRadius(type),
      duration: getEventDuration(type),
      startTime: Date.now(),
      severity: getEventSeverity(type),
      participants: generateParticipants(type),
      playerInvolved: false
    };

    return event;
  };

  const getEventTitle = (type: DynamicEvent['type']): string => {
    switch (type) {
      case 'gang_war':
        return 'Gang War Erupting';
      case 'police_raid':
        return 'Police Raid in Progress';
      case 'street_race':
        return 'Illegal Street Race';
      case 'drug_bust':
        return 'Drug Deal Gone Wrong';
      case 'civilian_incident':
        return 'Civilian Disturbance';
      default:
        return 'Unknown Event';
    }
  };

  const getEventDescription = (type: DynamicEvent['type']): string => {
    switch (type) {
      case 'gang_war':
        return 'Two rival gangs are engaged in a violent shootout. Stay clear or join the chaos.';
      case 'police_raid':
        return 'Police have surrounded a building. High-value targets may be inside.';
      case 'street_race':
        return 'Underground racers are gathering. Fast cars and easy money await.';
      case 'drug_bust':
        return 'A drug deal has turned violent. Money and drugs are scattered.';
      case 'civilian_incident':
        return 'Civilians are in distress. Help them or exploit the situation.';
      default:
        return 'Something is happening in the area.';
    }
  };

  const getEventRadius = (type: DynamicEvent['type']): number => {
    switch (type) {
      case 'gang_war': return 25;
      case 'police_raid': return 20;
      case 'street_race': return 30;
      case 'drug_bust': return 15;
      case 'civilian_incident': return 10;
      default: return 15;
    }
  };

  const getEventDuration = (type: DynamicEvent['type']): number => {
    switch (type) {
      case 'gang_war': return 180000; // 3 minutes
      case 'police_raid': return 240000; // 4 minutes
      case 'street_race': return 120000; // 2 minutes
      case 'drug_bust': return 90000; // 1.5 minutes
      case 'civilian_incident': return 150000; // 2.5 minutes
      default: return 120000;
    }
  };

  const getEventSeverity = (type: DynamicEvent['type']): number => {
    switch (type) {
      case 'gang_war': return 90;
      case 'police_raid': return 85;
      case 'street_race': return 30;
      case 'drug_bust': return 70;
      case 'civilian_incident': return 20;
      default: return 50;
    }
  };

  const generateParticipants = (type: DynamicEvent['type']): string[] => {
    switch (type) {
      case 'gang_war':
        return ['gang_member_1', 'gang_member_2', 'gang_member_3', 'rival_gang_1', 'rival_gang_2'];
      case 'police_raid':
        return ['swat_1', 'swat_2', 'detective_1', 'patrol_1'];
      case 'street_race':
        return ['racer_1', 'racer_2', 'racer_3', 'mechanic'];
      case 'drug_bust':
        return ['dealer', 'buyer', 'enforcer'];
      case 'civilian_incident':
        return ['civilian_1', 'civilian_2', 'civilian_3'];
      default:
        return [];
    }
  };

  // Spawn events periodically
  useEffect(() => {
    const spawnEvent = () => {
      if (activeEvents.length < 3) { // Max 3 concurrent events
        const event = generateRandomEvent();
        if (event) {
          setActiveEvents(prev => [...prev, event]);
          setEventNotifications(prev => [...prev, event]);
          onEventTriggered(event);
          
          // Auto-remove notification after 5 seconds
          setTimeout(() => {
            setEventNotifications(prev => prev.filter(e => e.id !== event.id));
          }, 5000);
        }
      }
    };

    const interval = setInterval(spawnEvent, 15000 + Math.random() * 15000); // 15-30 seconds
    return () => clearInterval(interval);
  }, [activeEvents.length]);

  // Check if player is in event area
  useEffect(() => {
    setActiveEvents(prev => prev.map(event => {
      const distance = Math.sqrt(
        Math.pow(event.location[0] - playerPosition[0], 2) +
        Math.pow(event.location[2] - playerPosition[2], 2)
      );
      
      const wasInvolved = event.playerInvolved;
      const isInvolved = distance <= event.radius;
      
      if (isInvolved && !wasInvolved) {
        gameStore.addAction(`entered_event_${event.type}`);
        
        // Apply event effects
        switch (event.type) {
          case 'gang_war':
            gameStore.updateStats({ wanted: Math.min(gameStore.playerStats.wanted + 1, 5) });
            break;
          case 'police_raid':
            gameStore.updateStats({ wanted: Math.min(gameStore.playerStats.wanted + 2, 5) });
            break;
          case 'street_race':
            // Chance to win money
            if (Math.random() > 0.5) {
              gameStore.updateStats({ money: gameStore.playerStats.money + 1000 });
              gameStore.addAction('won_street_race');
            }
            break;
          case 'drug_bust':
            // Chance to find money or drugs
            if (Math.random() > 0.6) {
              gameStore.updateStats({ money: gameStore.playerStats.money + 500 });
              gameStore.addAction('found_drug_money');
            }
            break;
        }
      }
      
      return { ...event, playerInvolved: isInvolved };
    }));
  }, [playerPosition]);

  // Remove expired events
  useEffect(() => {
    const now = Date.now();
    setActiveEvents(prev => prev.filter(event => now - event.startTime < event.duration));
  }, []);

  const getEventIcon = (type: DynamicEvent['type']) => {
    switch (type) {
      case 'gang_war': return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'police_raid': return <AlertTriangle className="h-5 w-5 text-blue-500" />;
      case 'street_race': return <Car className="h-5 w-5 text-yellow-500" />;
      case 'drug_bust': return <AlertTriangle className="h-5 w-5 text-purple-500" />;
      case 'civilian_incident': return <Users className="h-5 w-5 text-orange-500" />;
      default: return <AlertTriangle className="h-5 w-5" />;
    }
  };

  const getSeverityColor = (severity: number) => {
    if (severity > 80) return 'text-red-500';
    if (severity > 60) return 'text-orange-500';
    if (severity > 40) return 'text-yellow-500';
    return 'text-green-500';
  };

  return (
    <>
      {/* Event Notifications */}
      <div className="absolute top-32 right-4 space-y-2 max-w-sm">
        {eventNotifications.map(event => (
          <div 
            key={event.id} 
            className="bg-black/90 text-white p-3 rounded-lg border border-red-500/70 backdrop-blur-sm animate-slide-in"
          >
            <div className="flex items-center mb-2">
              {getEventIcon(event.type)}
              <h4 className="ml-2 font-bold text-sm">{event.title}</h4>
            </div>
            <p className="text-xs text-gray-300">{event.description}</p>
            <div className="flex justify-between items-center mt-2 text-xs">
              <span className="text-gray-400">Severity:</span>
              <span className={getSeverityColor(event.severity)}>
                {event.severity}%
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Active Events List */}
      {activeEvents.length > 0 && (
        <div className="absolute bottom-40 right-4 p-3 bg-black/90 text-white rounded-lg border border-red-500/70 backdrop-blur-sm max-w-xs">
          <h3 className="text-sm font-bold text-red-400 mb-2 flex items-center">
            <AlertTriangle className="h-4 w-4 mr-1" />
            ACTIVE EVENTS
          </h3>
          
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {activeEvents.map(event => {
              const timeLeft = Math.max(0, event.duration - (Date.now() - event.startTime));
              const distance = Math.sqrt(
                Math.pow(event.location[0] - playerPosition[0], 2) +
                Math.pow(event.location[2] - playerPosition[2], 2)
              );
              
              return (
                <div key={event.id} className="text-xs border-b border-gray-700 pb-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{event.title}</span>
                    {event.playerInvolved && (
                      <span className="text-green-400 text-xs">ACTIVE</span>
                    )}
                  </div>
                  <div className="flex justify-between text-gray-400 mt-1">
                    <span>Distance: {Math.round(distance)}m</span>
                    <span className="flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {Math.round(timeLeft / 1000)}s
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
};

export default DynamicEvents;