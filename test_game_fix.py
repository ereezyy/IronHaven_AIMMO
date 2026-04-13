import re

def process_file(filepath):
    print(f"Processing {filepath}")
    with open(filepath, 'r') as f:
        content = f.read()

    # Just ensure no Math.sqrt causes ReferenceError because of unassigned variables.
    if "SmartNPC.tsx" in filepath:
        if "distanceToTargetSq < 9" in content and "distanceToTargetSq" not in content[:content.find("distanceToTargetSq < 9")]:
            print("Missing distanceToTargetSq")

if __name__ == "__main__":
    import sys
    process_file(sys.argv[1])
