import os
os.chdir('e:\\pdf\\memos-worker')

with open('src/public/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Find ALL document.addEventListener('click' handlers
count = content.count("document.addEventListener('click'")
print(f'Total click handlers: {count}')

# Show each one with context
idx = 0
for i in range(count):
    idx = content.find("document.addEventListener('click'", idx)
    # Show what follows to identify which handler
    snippet = content[idx:idx+300]
    print(f'#{i+1} at {idx}:')
    print(f'  {repr(snippet[:200])}')
    print()
    idx += 50

# Also check if the export modal button has the right ID and the click handler checks for it
print('open-export-modal-btn in file:', 'open-export-modal-btn' in content)
print('openExportModal function:', 'function openExportModal' in content)
print('closeExportModal function:', 'function closeExportModal' in content)
