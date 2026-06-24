with open('src/index.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix isPinned PUT
content = content.replace(
    "formData.get('isPinned') === 'true' ? 1 : 0",
    "formData.get('isPinned') === 'true' ? '1' : '0'"
)

# Fix isFavorited PUT - verify it's fixed
content = content.replace(
    "formData.get('isFavorited') === 'true' ? 1 : 0",
    "formData.get('isFavorited') === 'true' ? '1' : '0'"
)

# Fix isArchived PUT - verify it's fixed
content = content.replace(
    "formData.get('is_archived') === 'true' ? 1 : 0",
    "formData.get('is_archived') === 'true' ? '1' : '0'"
)

# Fix GET: n.is_archived = 1 -> n.is_archived = '1'
content = content.replace(
    'whereClauses.push("n.is_archived = 1");',
    "whereClauses.push(\"n.is_archived = '1'\");"
)

# Fix GET: n.is_archived = 0 -> n.is_archived = '0'
content = content.replace(
    'whereClauses.push("n.is_archived = 0");',
    "whereClauses.push(\"n.is_archived = '0'\");"
)

# Fix GET: n.is_favorited = 1 (in notes list handler - already fixed from earlier run)
# Fix GET: n.is_favorited = 1 (in search handler - same)
content = content.replace(
    'whereClauses.push("n.is_favorited = 1");',
    "whereClauses.push(\"n.is_favorited = '1'\");"
)

with open('src/index.js', 'w', encoding='utf-8') as f:
    f.write(content)

print('All replacements done')

# Verify
with open('src/index.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Count remaining occurrences of old patterns
print('isPinned ? 1 : 0:',
      "formData.get('isPinned') === 'true' ? 1 : 0" in content)
print('isFavorited ? 1 : 0:',
      "formData.get('isFavorited') === 'true' ? 1 : 0" in content)
print('isArchived ? 1 : 0:',
      "formData.get('is_archived') === 'true' ? 1 : 0" in content)
print('n.is_archived = 1 (without quotes):',
      'whereClauses.push("n.is_archived = 1");' in content)
print('n.is_archived = 0 (without quotes):',
      'whereClauses.push("n.is_archived = 0");' in content)
print('n.is_favorited = 1 (without quotes):',
      'whereClauses.push("n.is_favorited = 1");' in content)
