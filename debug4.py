with open('src/public/index.html', 'rb') as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if b'deleteBtn.dataset.fileId' in line and i > 8000:
        print(f'Line {i+1}: {repr(line)}')
        if i+1 < len(lines):
            print(f'Line {i+2}: {repr(lines[i+1])}')
        if i+2 < len(lines):
            print(f'Line {i+3}: {repr(lines[i+2])}')
        break
