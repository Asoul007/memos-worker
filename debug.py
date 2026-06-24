with open('src/index.js', 'rb') as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if b'for (const file of files)' in line:
        print(f'Line {i+1}: {repr(line)}')
        for j in range(i, min(i+8, len(lines))):
            print(f'  {j+1}: {repr(lines[j])}')
        break
