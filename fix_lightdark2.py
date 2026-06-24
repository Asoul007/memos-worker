with open('src/public/index.html', 'r', encoding='utf-8') as f:
    c = f.read()

# Direct replacement - match the exact broken text
old1 = "'<span>${t(\"Light Mode\")}</span>'"
new1 = "'<span>' + t('Light Mode') + '</span>'"
if old1 in c:
    c = c.replace(old1, new1)
    print('Fixed Light Mode')
else:
    print('FAIL Light Mode')

old2 = "'<span>${t(\"Dark Mode\")}</span>'"
new2 = "'<span>' + t('Dark Mode') + '</span>'"
if old2 in c:
    c = c.replace(old2, new2)
    print('Fixed Dark Mode')
else:
    print('FAIL Dark Mode')

with open('src/public/index.html', 'w', encoding='utf-8') as f:
    f.write(c)

# Verify
if "' + t('Light Mode') + '" in c[200000:]:
    print('VERIFIED')
else:
    print('NOT VERIFIED')
