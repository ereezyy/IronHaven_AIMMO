import re

def process_file(filepath):
    print(f"Processing {filepath}")
    with open(filepath, 'r') as f:
        content = f.read()

    # SmartNPC.tsx - second pass
    if "SmartNPC.tsx" in filepath:
        content = content.replace("const distanceToPlayer = Math.sqrt(\n      (position[0] - playerPosition[0]) * (position[0] - playerPosition[0]) +\n      (position[2] - playerPosition[2]) * (position[2] - playerPosition[2])\n    );", "const distanceToPlayerSq = (position[0] - playerPosition[0]) * (position[0] - playerPosition[0]) +\n      (position[2] - playerPosition[2]) * (position[2] - playerPosition[2]);")
        content = content.replace("distanceToPlayer < 30", "distanceToPlayerSq < 900")
        content = content.replace("distanceToPlayer < 8", "distanceToPlayerSq < 64")
        content = content.replace("distanceToPlayer < 20", "distanceToPlayerSq < 400")
        content = content.replace("distanceToPlayer < 15", "distanceToPlayerSq < 225")
        content = content.replace("distanceToPlayer < 10", "distanceToPlayerSq < 100")
        content = content.replace("distanceToPlayer < 12", "distanceToPlayerSq < 144")
        content = content.replace("distanceToPlayer < 5", "distanceToPlayerSq < 25")

        content = content.replace("const distanceToTarget = Math.sqrt(\n            (position[0] - state.target[0]) * (position[0] - state.target[0]) +\n            (position[2] - state.target[2]) * (position[2] - state.target[2])\n          );", "const distanceToTargetSq = (position[0] - state.target[0]) * (position[0] - state.target[0]) +\n            (position[2] - state.target[2]) * (position[2] - state.target[2]);")
        content = content.replace("if (distanceToTarget < 3) {", "if (distanceToTargetSq < 9) {")

        content = content.replace("const dx = target[0] - position[0];\n    const dz = target[2] - position[2];\n    const distance = Math.sqrt(dx * dx + dz * dz);\n    \n    if (distance > 1) {\n      const vx = (dx / distance) * speed;\n      const vz = (dz / distance) * speed;", "const dx = target[0] - position[0];\n    const dz = target[2] - position[2];\n    const distanceSq = dx * dx + dz * dz;\n    \n    if (distanceSq > 1) {\n      const distance = Math.sqrt(distanceSq);\n      const vx = (dx / distance) * speed;\n      const vz = (dz / distance) * speed;")

    with open(filepath, 'w') as f:
        f.write(content)

import sys
process_file(sys.argv[1])
