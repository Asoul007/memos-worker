import os
os.chdir('e:\\pdf\\memos-worker')

with open('src/public/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the LANG object
idx = content.find('const LANG = {')
if idx < 0:
    print('ERROR: LANG not found')
    exit()

# Find the end of LANG
end = content.find('};', idx) + 2
lang_section = content[idx:end]

# Count braces
opens = lang_section.count('{')
closes = lang_section.count('}')
print(f'LANG object: opens={opens}, closes={closes}')
print(f'Length: {len(lang_section)}')
print(f'First 200: {repr(lang_section[:200])}')
print(f'Last 200: {repr(lang_section[-200:])}')
