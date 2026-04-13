import re
def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    if "PoliceSystem.tsx" in filepath:
        content = content.replace("const distanceSq = (\n        (unit.position[0] - playerPosition[0]) * (unit.position[0] - playerPosition[0]) +\n        (unit.position[2] - playerPosition[2]) * (unit.position[2] - playerPosition[2])\n      );\n      \n      if (unit.health > 0 && distanceSq < 900 && Date.now() - unit.lastFireTime > 1000) {", "const distanceSq = (\n        (unit.position[0] - playerPosition[0]) * (unit.position[0] - playerPosition[0]) +\n        (unit.position[2] - playerPosition[2]) * (unit.position[2] - playerPosition[2])\n      );\n      \n      if (unit.health > 0 && distanceSq < 900 && Date.now() - unit.lastFireTime > 1000) {")
        content = re.sub(r"const distanceSq = \(\n        \(unit.position\[0\] - playerPosition\[0\]\) \* \(unit.position\[0\] - playerPosition\[0\]\) \+\n        \(unit.position\[2\] - playerPosition\[2\]\) \* \(unit.position\[2\] - playerPosition\[2\]\)\n      \);\n      \n      if \(unit.health > 0 && distanceSq < 900 && Date\.now\(\) - unit\.lastFireTime > 1000\) {", "const distanceSq = (\n        (unit.position[0] - playerPosition[0]) * (unit.position[0] - playerPosition[0]) +\n        (unit.position[2] - playerPosition[2]) * (unit.position[2] - playerPosition[2])\n      );\n      \n      if (unit.health > 0 && distanceSq < 900 && Date.now() - unit.lastFireTime > 1000) {", content)

    with open(filepath, 'w') as f:
        f.write(content)
