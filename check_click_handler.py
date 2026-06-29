import os
os.chdir('e:\\pdf\\memos-worker')

with open('src/public/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the click handler for export
idx = content.find("document.addEventListener('click'")
if idx >= 0:
    end = content.find('\n\n\t// --- 为瀑布', idx)
    if end < 0:
        end = idx + 2000
    handler = content[idx:end]
    print(handler)
