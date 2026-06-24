with open('src/public/index.html', 'rb') as f:
    c = f.read()

# Add guard for empty fileId in attachments delete handler
old = b"\t\t\tconst fileId = deleteBtn.dataset.fileId;\r\n\r\n\t\t\tconst confirmed = await showCustomConfirm('Are you sure you want to permanently delete this file? This action cannot be undone.');"
new = b"\t\t\tconst fileId = deleteBtn.dataset.fileId;\r\n\t\t\tif (!fileId) return;\r\n\r\n\t\t\tconst confirmed = await showCustomConfirm('Are you sure you want to permanently delete this file? This action cannot be undone.');"

if old in c:
    c = c.replace(old, new)
    print('OK attachments delete guard')
else:
    print('FAIL attachments delete guard')

# Also add guard in the main note card delete handler
old2 = b"\t\t\tconst fileId = deleteBtn.dataset.fileId;\r\n\r\n\t\t\tconst confirmed = await showCustomConfirm('Are you sure you want to permanently delete this file?"
new2 = b"\t\t\tconst fileId = deleteBtn.dataset.fileId;\r\n\t\t\tif (!fileId) return;\r\n\r\n\t\t\tconst confirmed = await showCustomConfirm('Are you sure you want to permanently delete this file?"

if old2 in c:
    c = c.replace(old2, new2)
    print('OK note card delete guard')
else:
    print('FAIL note card delete guard')

with open('src/public/index.html', 'wb') as f:
    f.write(c)
print('Done')
