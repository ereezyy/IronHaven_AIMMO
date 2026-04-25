const fs = require('fs');
let content = fs.readFileSync('src/components/Game.tsx', 'utf8');

content = content.replace(/id: `police_blood_\${Date.now()}`/g, 'id: `police_blood_${crypto.randomUUID()}`');
content = content.replace(/id: `police_explosion_\${Date.now()}`/g, 'id: `police_explosion_${crypto.randomUUID()}`');
content = content.replace(/id: `blood_pool_\${Date.now()}`/g, 'id: `blood_pool_${crypto.randomUUID()}`');

// Delete duplicate function
const targetStr = `  const handleEventTriggered = useCallback(
    (event: any) => {
      // Add particle effects for events
      if (event.type === 'gang_war' || event.type === 'police_raid') {
        const effect = {
          id: \`event_particle_\${Date.now()}\`,
          type: 'explosion',
          position: event.location,
          intensity: event.severity / 100,
        };
        setParticleEffects((prev) => [...prev, effect]);
      }

      gameStore.addAction(\`event_\${event.type}_started\`);
    },
    [gameStore]
  );`;

content = content.replace(targetStr, '');

fs.writeFileSync('src/components/Game.tsx', content);
