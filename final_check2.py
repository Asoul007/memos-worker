import os, subprocess, tempfile
os.chdir('e:\\pdf\\memos-worker')

with open('src/public/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

script_start = content.rfind('<script>')
script_end = content.rfind('</script>')
js_code = content[script_start + len('<script>'):script_end]

with tempfile.NamedTemporaryFile(suffix='.js', mode='w', delete=False, encoding='utf-8') as f:
    f.write(js_code)
    temp_path = f.name
try:
    r = subprocess.run(['node', '--check', temp_path], capture_output=True, text=True, timeout=30)
    print('Syntax:', 'OK' if r.returncode == 0 else 'ERROR')
finally:
    os.unlink(temp_path)

# Check no text after </script>
after_script = content[script_end+9:]
if after_script.strip():
    print(f'WARNING: text after </script>: {repr(after_script[:100])}')
else:
    print('No text after </script>: OK')

# Verify export features
for fn in ['triggerExportJSON', 'triggerExportSingleMD', 'triggerExportMDZip']:
    print(f'  {fn}: {content.count("function " + fn + "()")} def(s)')

# Verify click handler
print(f'  export click handler: {content.count("open-export-modal-btn")}')
print(f'  close button: {content.count("close-export-modal-btn")}')
