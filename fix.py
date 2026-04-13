import re

def process_file(filepath):
    print(f"Processing {filepath}")
    with open(filepath, 'r') as f:
        content = f.read()

    if "PoliceSystem.tsx" in filepath:
        content = content.replace("const distance = dx * dx + dz * dz;\n        \n        if (distanceSq > 4) {", "const distanceSq = dx * dx + dz * dz;\n        \n        if (distanceSq > 4) {")
        content = content.replace("if (distanceSq > 4) {\n          const moveX = (dx / distance) * unit.speed * 0.1;\n          const moveZ = (dz / distance) * unit.speed * 0.1;", "if (distanceSq > 4) {\n          const distance = Math.sqrt(distanceSq);\n          const moveX = (dx / distance) * unit.speed * 0.1;\n          const moveZ = (dz / distance) * unit.speed * 0.1;")
        content = content.replace("const distance = (\n        (unit.position[0] - playerPosition[0]) * (unit.position[0] - playerPosition[0]) +\n        (unit.position[2] - playerPosition[2]) * (unit.position[2] - playerPosition[2])\n      );", "const distanceSq = (\n        (unit.position[0] - playerPosition[0]) * (unit.position[0] - playerPosition[0]) +\n        (unit.position[2] - playerPosition[2]) * (unit.position[2] - playerPosition[2])\n      );")
        content = content.replace("if (unit.health > 0 && distance < 30 && Date.now() - unit.lastFireTime > 1000) {", "if (unit.health > 0 && distanceSq < 900 && Date.now() - unit.lastFireTime > 1000) {")

    if "SmartNPC.tsx" in filepath:
        content = content.replace("const distance = (position[0] - playerPosition[0]) * (position[0] - playerPosition[0]) +\n      (position[2] - playerPosition[2]) * (position[2] - playerPosition[2]);\n\n    const playerWanted = gameStore.playerStats.wanted;\n    const playerRep = gameStore.playerStats.reputation;\n    const playerKills = gameStore.playerStats.policeKillCount;\n\n    // Line of sight check\n    const hasLineOfSight = distanceToPlayerSq < 900 && Math.random() > 0.2;", "const distanceToPlayerSq = (position[0] - playerPosition[0]) * (position[0] - playerPosition[0]) +\n      (position[2] - playerPosition[2]) * (position[2] - playerPosition[2]);\n\n    const playerWanted = gameStore.playerStats.wanted;\n    const playerRep = gameStore.playerStats.reputation;\n    const playerKills = gameStore.playerStats.policeKillCount;\n\n    // Line of sight check\n    const hasLineOfSight = distanceToPlayerSq < 900 && Math.random() > 0.2;")
        content = content.replace("const distance = (position[0] - state.target[0]) * (position[0] - state.target[0]) +\n            (position[2] - state.target[2]) * (position[2] - state.target[2]);\n          \n          if (distanceToTargetSq < 9) {", "const distanceToTargetSq = (position[0] - state.target[0]) * (position[0] - state.target[0]) +\n            (position[2] - state.target[2]) * (position[2] - state.target[2]);\n          \n          if (distanceToTargetSq < 9) {")

    if "VehicleSystem.tsx" in filepath:
        content = content.replace("const distance = (\n              (v.position[0] - playerPosition[0]) * (v.position[0] - playerPosition[0]) +\n              (v.position[2] - playerPosition[2]) * (v.position[2] - playerPosition[2])\n            );\n            return distanceSq < 25 && !v.occupied;", "const distanceSq = (\n              (v.position[0] - playerPosition[0]) * (v.position[0] - playerPosition[0]) +\n              (v.position[2] - playerPosition[2]) * (v.position[2] - playerPosition[2])\n            );\n            return distanceSq < 25 && !v.occupied;")
        content = content.replace("const distance = (\n                (vehicle.position[0] - playerPosition[0]) * (vehicle.position[0] - playerPosition[0]) +\n                (vehicle.position[2] - playerPosition[2]) * (vehicle.position[2] - playerPosition[2])\n              );\n              \n              return distanceSq < 36;", "const distanceSq = (\n                (vehicle.position[0] - playerPosition[0]) * (vehicle.position[0] - playerPosition[0]) +\n                (vehicle.position[2] - playerPosition[2]) * (vehicle.position[2] - playerPosition[2])\n              );\n              \n              return distanceSq < 36;")

    with open(filepath, 'w') as f:
        f.write(content)

import sys
process_file(sys.argv[1])
