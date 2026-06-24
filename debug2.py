with open('src/public/index.html', 'rb') as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if b"shareButtonHTML" in line and b"deleteButtonHTML" in line:
        print(f'Line {i+1}: {repr(line)}')
    if b"if (item.id)" in line:
        print(f'Line {i+1}: {repr(line)}')
