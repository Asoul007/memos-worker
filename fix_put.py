with open('src/index.js', 'rb') as f:
    lines = f.readlines()

# ---- Fix 1: Add videoUrls array after picUrls line ----
for i, line in enumerate(lines):
    if b'const picUrls = extractImageUrls(content);' in line and i > 680:
        # Check if videoUrls already exists nearby
        nearby = lines[i:i+10]
        if not any(b'videoUrls' in l for l in nearby):
            lines.insert(i+1, b'\t\t\t\t\tconst videoUrls = [];\r\n')
            print(f'OK add videoUrls at line {i+2}')
        else:
            print('Already has videoUrls')
        break

# ---- Fix 2: Modify PUT file loop to separate video files ----
for i, line in enumerate(lines):
    if b'for (const file of newFiles) {' in line:
        indent4 = b'\t\t\t\t\t'
        indent5 = b'\t\t\t\t\t\t'
        indent6 = b'\t\t\t\t\t\t\t'
        old = lines[i:i+8]
        new = [
            indent4 + b'for (const file of newFiles) {\r\n',
            indent5 + b"if (file.name && file.size > 0 && !file.type.startsWith('image/')) {\r\n",
            indent6 + b'const fileId = crypto.randomUUID();\r\n',
            indent6 + b'await env.NOTES_R2_BUCKET.put(`${id}/${fileId}`, file.stream());\r\n',
            indent6 + b"if (file.type.startsWith('video/')) {\r\n",
            indent6 + b'\tvideoUrls.push(`/api/files/${id}/${fileId}`);\r\n',
            indent6 + b'} else {\r\n',
            indent6 + b'\tcurrentFiles.push({ id: fileId, name: file.name, size: file.size, type: file.type });\r\n',
            indent6 + b'}\r\n',
            indent5 + b'}\r\n',
            indent4 + b'}\r\n',
        ]
        lines[i:i+8] = new
        print(f'OK PUT file loop at line {i+1}')
        break

# ---- Fix 3: Add videos to UPDATE SQL and bind ----
for i, line in enumerate(lines):
    if b'UPDATE notes SET content = ?, files = ?, updated_at = ?, pics = ? WHERE id = ?' in line:
        old_sql = lines[i]
        new_sql = b'\t\t\t\t\t\t"UPDATE notes SET content = ?, files = ?, updated_at = ?, pics = ?, videos = ? WHERE id = ?"\r\n'
        lines[i] = new_sql
        print(f'OK UPDATE SQL at line {i+1}')
        break

# Fix the bind call
for i, line in enumerate(lines):
    if b'await stmt.bind(content, JSON.stringify(currentFiles), newTimestamp, picUrls, id).run();' in line:
        # Need to build the videos JSON - combine existing + new
        old_bind = lines[i]
        new_bind = b'\t\t\t\t\tconst existingVideos = (() => { try { return JSON.parse(existingNote.videos || \\"[]\\"); } catch(e) { return []; } })();\n\t\t\t\t\tconst allVideos = [...existingVideos, ...videoUrls];\n\t\t\t\t\tawait stmt.bind(content, JSON.stringify(currentFiles), newTimestamp, picUrls, JSON.stringify(allVideos), id).run();\r\n'
        lines[i] = new_bind
        print(f'OK UPDATE bind at line {i+1}')
        break

with open('src/index.js', 'wb') as f:
    f.writelines(lines)

print('Done PUT handler fixes')
