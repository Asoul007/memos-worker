import os
os.chdir('e:\\pdf\\memos-worker')

with open('src/public/index.html', 'rb') as f:
    content = f.read()

# Find the LANG object and script tags
lang_idx = content.find(b'const LANG = {')
script_start = content.find(b'<script>', lang_idx - 1000) if lang_idx >= 0 else -1
script_end = content.find(b'</script>', lang_idx) if lang_idx >= 0 else -1
last_script_start = content.rfind(b'<script>')
last_script_end = content.rfind(b'</script>')

print(f'LANG starts at byte {lang_idx}')
print(f'Last <script> at byte {last_script_start}')
print(f'Last </script> at byte {last_script_end}')

if lang_idx >= 0:
    if lang_idx > script_start and lang_idx < script_end:
        print('LANG is INSIDE the LAST script (OK)')
    elif lang_idx > last_script_start and lang_idx < last_script_end:
        print('LANG is INSIDE the main script (OK)')
    else:
        print(f'WARNING: LANG might be OUTSIDE script tags')
        # Show 50 chars before LANG
        before = max(0, lang_idx - 100)
        print(f'Context before LANG: {repr(content[before:lang_idx])}')
        # Check if there's a <script> tag between LANG and the previous </script>
        prev_script_end = content.rfind(b'</script>', 0, lang_idx)
        if prev_script_end >= 0:
            next_script_start = content.find(b'<script>', prev_script_end)
            if next_script_start >= 0 and next_script_start < lang_idx:
                print(f'LANG is inside script tag starting at {next_script_start}')
            elif next_script_start >= 0 and next_script_start > lang_idx:
                print(f'LANG is BETWEEN </script> and next <script> - PROBLEM!')
                print(f'Between bytes: {prev_script_end} to {next_script_start}')
                between = content[prev_script_end:next_script_start]
                print(f'Content between: {repr(between[:200])}')
