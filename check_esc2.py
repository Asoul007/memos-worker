with open('src/index.js', 'r', encoding='utf-8') as f:
    c = f.read()
issues = []
for i, line in enumerate(c.split('\n'), 1):
    if '\\`' in line or '\\${' in line:
        issues.append((i, line.strip()))
if issues:
    for ln, text in issues:
        print(f'Line {ln}: {text[:120]}')
else:
    print('No escaping issues in index.js')
