import os
import re

def main():
    with open('src/components/MMOPlayer.tsx', 'r') as f:
        content = f.read()

    content = content.replace("Math.pow(1 - friction * delta, delta)", "Math.max(0, 1 - friction * delta)")
    with open('src/components/MMOPlayer.tsx', 'w') as f:
        f.write(content)

    with open('src/components/Game.tsx', 'r') as f:
        content = f.read()

    content = content.replace("Math.pow(1 - friction * delta, delta)", "Math.max(0, 1 - friction * delta)")
    with open('src/components/Game.tsx', 'w') as f:
        f.write(content)

if __name__ == '__main__':
    main()
