import os
os.chdir('e:\\pdf\\memos-worker')

# Read the current file
with open('src/public/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Read the git HEAD version
import subprocess
result = subprocess.run(['git', 'show', 'HEAD:src/public/index.html'], capture_output=True, text=True)
git_content = result.stdout

# Extract the triggerExportMDZip function from git HEAD
git_idx = git_content.find('function triggerExportMDZip()')
if git_idx < 0:
    print('ERROR: MDZip not found in git HEAD')
    exit()

# Find the function end (next function declaration or document.addEventListener)
git_end = git_content.find('\n\tfunction ', git_idx + 5)
if git_end < 0:
    git_end = git_content.find('\n\tdocument.addEventListener', git_idx)
if git_end < 0:
    print('ERROR: Cannot find end of MDZip in git')
    exit()

mdzip_fn = git_content[git_idx:git_end]
print(f'MDZip function extracted: {len(mdzip_fn)} chars')

# Find where to insert in current file - after triggerExportSingleMD
current_idx = content.find('function triggerExportSingleMD()')
if current_idx < 0:
    print('ERROR: triggerExportSingleMD not found in current file')
    exit()

# Find the end of triggerExportSingleMD in current file
current_end = content.find('\n\tfunction ', current_idx + 5)
if current_end < 0:
    print('ERROR: Cannot find end of triggerExportSingleMD')
    exit()

# Insert MDZip function after triggerExportSingleMD
insert_pos = content.find('\n', current_end - 1)  # Find the newline before the next function
content = content[:current_end] + '\n' + mdzip_fn + content[current_end:]

print(f'Inserted MDZip function after triggerExportSingleMD')

# Now apply the YAML i18n changes to the MDZip function
# Replace pinned and favorited
old_pinned = "md += 'pinned: true\\n';"
new_pinned = "md += t('pinned') + ': true\\n';"
content = content.replace(old_pinned, new_pinned, 1)

old_fav = "md += 'favorited: true\\n';"
new_fav = "md += t('favorited') + ': true\\n';"
content = content.replace(old_fav, new_fav, 1)

# Replace created, updated, tags (these might already have t() calls)
old_created = "md += 'created: '"
new_created = "md += t('created') + ': '"
content = content.replace(old_created, new_created)

old_updated = "md += 'updated: '"
new_updated = "md += t('updated') + ': '"
content = content.replace(old_updated, new_updated)

old_tags = "md += 'tags: ["
new_tags = "md += t('tags') + ': ['"
content = content.replace(old_tags, new_tags)

# Also fix the error handler to use t() for error messages
content = content.replace(
    "showToast('Export failed: ' + err.message, 'error');",
    "showToast(t('Export failed') + ': ' + err.message, 'error');"
)

with open('src/public/index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print('Done: MDZip function restored with i18n YAML keys')
