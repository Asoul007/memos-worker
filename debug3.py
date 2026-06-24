with open('src/public/index.html', 'rb') as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if b"deleteBtn = e.target.closest" in line and i > 5200 and i < 5400:
        for j in range(i, min(i+10, len(lines))):
            print(f'  {j+1}: {repr(lines[j])}')
        break
