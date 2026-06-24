with open('src/index.js', 'rb') as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if b'existingVideos' in line or b'allVideos' in line:
        print(f'Line {i+1}: {repr(line)}')
