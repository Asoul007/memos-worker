import os
os.chdir('e:\\pdf\\memos-worker')

with open('src/public/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

script_start = content.rfind('<script>')
script_end = content.rfind('</script>')
js_code = content[script_start + len('<script>'):script_end]

lines = js_code.split('\n')
# Show lines 2695-2715
for i in range(2695, min(2715, len(lines))):
    print(f'{i+1}: {repr(lines[i][:200])}')
