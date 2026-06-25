with open(r'e:\pdf\memos-worker\src\public\docs.html', 'r', encoding='utf-8') as f:
    content = f.read()

replacements = {}

# Line 877: double-quoted, single-quoted HTML attrs
old1 = "saveBtn.innerHTML = \"<i class='fas fa-save'></i> Save\";"
new1 = "saveBtn.innerHTML = \"<i class='fas fa-save'></i> \" + t('Save') + \"\";"

# Line 957: single-quoted outer, escaped inner
old2 = "saveBtn.innerHTML = '<i class=\'fas fa-check\'></i> Saved';"
new2 = "saveBtn.innerHTML = '<i class=\'fas fa-check\'></i> ' + t('Saved') + '';"

# Line 969: Saving...
old3 = "saveBtn.innerHTML = '<i class=\'fas fa-spinner fa-spin\'></i> Saving...';"
new3 = "saveBtn.innerHTML = '<i class=\'fas fa-spinner fa-spin\'></i> ' + t('Saving...') + '';"

# Line 972: Saved (second occurrence)
old4 = "saveBtn.innerHTML = '<i class=\'fas fa-check\'></i> Saved';"
new4 = "saveBtn.innerHTML = '<i class=\'fas fa-check\'></i> ' + t('Saved') + '';"

# Line 978: Error
old5 = "saveBtn.innerHTML = '<i class=\'fas fa-times\'></i> Error';"
new5 = "saveBtn.innerHTML = '<i class=\'fas fa-times\'></i> ' + t('Error') + '';"

# Line 979: Save in setTimeout
old6 = "setTimeout(() => { saveBtn.disabled = false; saveBtn.innerHTML = '<i class=\'fas fa-save\'></i> Save'; }, 2000);"
new6 = "setTimeout(() => { saveBtn.disabled = false; saveBtn.innerHTML = '<i class=\'fas fa-save\'></i> ' + t('Save') + ''; }, 2000);"

for old_str, new_str in [(old1, new1), (old2, new2), (old3, new3), (old4, new4), (old5, new5), (old6, new6)]:
    if old_str in content:
        content = content.replace(old_str, new_str)
        print(f'OK: {old_str[:50]}...')
    else:
        print(f'MISS: {old_str[:50]}...')

with open(r'e:\pdf\memos-worker\src\public\docs.html', 'w', encoding='utf-8', newline='\r\n') as f:
    f.write(content)
print('\nDone')
