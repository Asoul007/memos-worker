import os
os.chdir('e:\\pdf\\memos-worker')

with open('src/public/index.html', 'rb') as f:
    content = f.read()

# Find the export-related keys outside of script tags
text = b'"No notes to export"'
idx = 0
while True:
    idx = content.find(text, idx)
    if idx < 0:
        break
    # Check if this is inside a script tag
    prev_script = content.rfind(b'<script>', 0, idx)
    prev_script_end = content.rfind(b'</script>', 0, idx)

    if prev_script > prev_script_end:
        # Inside script tag
        pass
    else:
        # OUTSIDE script tag - problem!
        print(f'!!! Found OUTSIDE script at byte {idx}')
        print(f'Context: {repr(content[max(0,idx-80):idx+80])}')
    idx += len(text)

# Also check for the English i18n entries that might be in the body
for key in [b'"Memos Export"', b'"Export failed"', b'"Exported at"', b'"Total"', b'"notes"', b'"Updated"', b'"Tags"', b'"Pinned"', b'"created"', b'"Favorited"', b'"updated"', b'"tags"', b'"pinned"', b'"favorited"']:
    idx = 0
    while True:
        idx = content.find(key, idx)
        if idx < 0:
            break
        prev_script = content.rfind(b'<script>', 0, idx)
        prev_script_end = content.rfind(b'</script>', 0, idx)
        if prev_script <= prev_script_end:
            print(f'OUTSIDE script: {key} at byte {idx}')
            print(f'Context: {repr(content[max(0,idx-60):idx+60])}')
        idx += len(key)

print('Done scanning')
