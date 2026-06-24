with open('src/index.js', 'rb') as f:
    c = f.read()

# Check that videos is deleted from response
if b'delete note.videos;' in c:
    print('OK - videos deleted from response')
else:
    print('WARNING - videos not deleted from response')

# Check the attachments query still has 'video' type
idx = c.find(b"'video' AS type")
if idx >= 0:
    print('OK - video type in attachments query')
else:
    print('WARNING - video type missing from attachments query')
