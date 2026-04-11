import re
with open('src/components/TestGame.tsx', 'r') as f:
    content = f.read()

# Verify the Array.from usage
print("Array.from in TestGame.tsx:")
for line in content.splitlines():
    if "Array.from" in line:
        print(line)
