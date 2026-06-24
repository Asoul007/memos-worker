with open('src/index.js', 'rb') as f:
    lines = f.readlines()

# Check videoUrls
for i, line in enumerate(lines):
    if b'videoUrls' in line:
        print(f'Line {i+1}: {repr(line)}')

# Find file loop
for i, line in enumerate(lines):
    if b'for (const file of files)' in line:
        # Replace lines 599-606 (0-indexed: 598-605)
        old = lines[598:607]
        print(f'Replacing lines 599-606')
        indent4 = b'\t\t\t\t'
        indent5 = b'\t\t\t\t\t'
        indent6 = b'\t\t\t\t\t\t'
        new = [
            indent4 + b'for (const file of files) {\r\n',
            indent5 + b'if (file.name && file.size > 0 && !file.type.startsWith(\'image/\')) {\r\n',
            indent6 + b'const fileId = crypto.randomUUID();\r\n',
            indent6 + b'await env.NOTES_R2_BUCKET.put(`${noteId}/${fileId}`, file.stream());\r\n',
            indent6 + b'if (file.type.startsWith(\'video/\')) {\r\n',
            indent6 + b'\tvideoUrls.push(`/api/files/${noteId}/${fileId}`);\r\n',
            indent6 + b'} else {\r\n',
            indent6 + b'\tfilesMeta.push({ id: fileId, name: file.name, size: file.size, type: file.type });\r\n',
            indent6 + b'}\r\n',
            indent5 + b'}\r\n',
            indent4 + b'}\r\n',
        ]
        lines[598:607] = new
        print('OK file loop')
        break

# Find filesMeta update section
for i, line in enumerate(lines):
    if b'updateFilesStmt = db.prepare(' in line:
        prev_line = lines[i-1].strip() if i > 0 else b''
        if b'filesMeta' in prev_line:
            indent5 = b'\t\t\t\t\t'
            indent6 = b'\t\t\t\t\t\t'
            new_lines = [
                indent5 + b'if (videoUrls.length > 0) {\r\n',
                indent6 + b'const updateVideosStmt = db.prepare("UPDATE notes SET videos = ? WHERE id = ?");\r\n',
                indent6 + b'await updateVideosStmt.bind(JSON.stringify(videoUrls), noteId).run();\r\n',
                indent5 + b'}\r\n',
            ]
            # Insert after the closing brace of filesMeta block
            insert_after = i
            while insert_after < len(lines) and lines[insert_after].strip() != b'}':
                insert_after += 1
            if insert_after < len(lines):
                insert_after += 1  # After the closing brace
                has_videos_update = any(b'updateVideosStmt' in l for l in lines[insert_after:insert_after+10])
                if not has_videos_update:
                    lines[insert_after:insert_after] = new_lines
                    print(f'OK videos update at line {insert_after+1}')
                else:
                    print('Already has videos update')
            break

with open('src/index.js', 'wb') as f:
    f.writelines(lines)

print('Done')
