with open('src/public/index.html', 'rb') as f:
    c = f.read()

old = b"let shareButtonHTML = '', deleteButtonHTML = '';\r\n\t\t\tif (item.id) {"
new = b"let shareButtonHTML = '', deleteButtonHTML = '';\r\n\t\t\t{"

if old in c:
    c = c.replace(old, new)
    print('OK - removed item.id condition')
else:
    print('NOT FOUND - trying debug...')
    idx = c.find(b'shareButtonHTML')
    if idx >= 0:
        print(repr(c[idx:idx+80]))

with open('src/public/index.html', 'wb') as f:
    f.write(c)
print('Done')
