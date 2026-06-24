with open('src/index.js', 'r', encoding='utf-8') as f:
    c = f.read()

# Fix the escaping in the videos bind code
old = """const existingVideos = (() => { try { return JSON.parse(existingNote.videos || \\"[]\\"); } catch(e) { return []; } })();
\t\t\t\t\tconst allVideos = [...existingVideos, ...videoUrls];
\t\t\t\t\tawait stmt.bind(content, JSON.stringify(currentFiles), newTimestamp, picUrls, JSON.stringify(allVideos), id).run();"""

new = """const existingVideos = (() => { try { return JSON.parse(existingNote.videos || '[]'); } catch(e) { return []; } })();
\t\t\t\t\tconst allVideos = [...existingVideos, ...videoUrls];
\t\t\t\t\tawait stmt.bind(content, JSON.stringify(currentFiles), newTimestamp, picUrls, JSON.stringify(allVideos), id).run();"""

if old in c:
    c = c.replace(old, new)
    print('OK fix escaping')
else:
    print('FAIL fix escaping')

with open('src/index.js', 'w', encoding='utf-8') as f:
    f.write(c)
print('Done')
