"""
Build huipot-review-export.zip in memory (never written as text),
validate it, then write huipot-review-export.transport.json which
contains the complete Base64 encoding and SHA-256 of the binary zip.
All file I/O for the zip bytes is strictly binary.
"""
import base64, hashlib, io, json, os, pathlib, zipfile

BASE = pathlib.Path('/home/user/app')

INCLUDE_PATHS = [
    'contracts/HuiPotGoalPool.sol',
    'contracts/foundry.toml',
    'contracts/test',
    'contracts/out/HuiPotGoalPool.sol/HuiPotGoalPool.json',
    'contracts/out/build-info',
    'contracts/contract-metadata',
    'src',
    'index.html',
    'vite.config.ts',
    'tailwind.config.js',
    'postcss.config.js',
    'tsconfig.json',
    'tsconfig.node.json',
    'package.json',
    'bun.lock',
    'foundry.toml',
    'env.example',
    'AGENTS.md',
    'architecture.md',
    'docs',
    'export-logs',
]

EXCLUDE_NAMES = {
    '.env', '.env.local', '.env.production', '.env.development',
    'node_modules', '.git', '__pycache__', '.DS_Store',
    'huipot-review-export.zip', 'huipot-review-export.transport.json',
    'scripts',
}
EXCLUDE_EXTS = {'.pyc'}

# --- Build ZIP into an in-memory buffer (never decoded as text) ---
buf = io.BytesIO()
file_count = 0
skipped = []

with zipfile.ZipFile(buf, mode='w', compression=zipfile.ZIP_DEFLATED,
                     allowZip64=True) as zf:
    for rel in INCLUDE_PATHS:
        p = BASE / rel
        if not p.exists():
            skipped.append(str(rel))
            continue
        if p.is_file():
            # Read as binary, store as binary
            zf.write(str(p), f'huipot/{rel}')
            file_count += 1
        else:
            for root, dirs, files in os.walk(str(p)):
                dirs[:] = [d for d in sorted(dirs) if d not in EXCLUDE_NAMES]
                for fname in sorted(files):
                    if fname in EXCLUDE_NAMES:
                        continue
                    if any(fname.endswith(e) for e in EXCLUDE_EXTS):
                        continue
                    full = pathlib.Path(root) / fname
                    arc = 'huipot/' + str(full.relative_to(BASE))
                    zf.write(str(full), arc)
                    file_count += 1

# Retrieve raw bytes from the buffer
buf.seek(0)
zip_bytes = buf.read()
print(f'ZIP built in memory: {file_count} files, {len(zip_bytes):,} bytes')
if skipped:
    print(f'Skipped (not found): {skipped}')

# --- Validate the in-memory ZIP before doing anything else ---
buf.seek(0)
with zipfile.ZipFile(buf, 'r') as zf_check:
    bad = zf_check.testzip()
    names = zf_check.namelist()
if bad is not None:
    raise RuntimeError(f'In-memory ZIP validation failed on: {bad}')
print(f'In-memory ZIP valid: {len(names)} entries, testzip() = None (all ok)')

# --- Write the validated binary ZIP to disk (binary mode only) ---
zip_path = BASE / 'huipot-review-export.zip'
with open(str(zip_path), 'wb') as fh:
    fh.write(zip_bytes)
print(f'Binary ZIP written to {zip_path}')

# --- Re-read from disk and re-validate ---
with open(str(zip_path), 'rb') as fh:
    disk_bytes = fh.read()
if disk_bytes != zip_bytes:
    raise RuntimeError('Disk bytes differ from in-memory bytes — write corruption')
with zipfile.ZipFile(io.BytesIO(disk_bytes), 'r') as zf_disk:
    bad2 = zf_disk.testzip()
if bad2 is not None:
    raise RuntimeError(f'On-disk ZIP validation failed on: {bad2}')
print('On-disk ZIP re-validated: ok')

# --- SHA-256 of the binary bytes ---
sha256 = hashlib.sha256(zip_bytes).hexdigest()
print(f'SHA-256: {sha256}')

# --- Standard Base64 encode (no line breaks) ---
b64 = base64.b64encode(zip_bytes).decode('ascii')
print(f'Base64 length: {len(b64)} chars')

# --- Build the transport JSON (pure ASCII/UTF-8, no binary content) ---
transport = {
    'archiveName': 'huipot-review-export.zip',
    'archiveBytes': len(zip_bytes),
    'sha256': sha256,
    'archiveBase64': b64,
}

transport_path = BASE / 'huipot-review-export.transport.json'
# Write as UTF-8 text; the Base64 payload is pure ASCII so this is safe
with open(str(transport_path), 'w', encoding='utf-8') as fh:
    json.dump(transport, fh, ensure_ascii=True, separators=(',', ':'))
    fh.write('\n')

transport_size = os.path.getsize(str(transport_path))
print(f'Transport JSON written: {transport_path} ({transport_size:,} bytes)')

# --- Final verification: re-read JSON, decode Base64, validate ZIP ---
with open(str(transport_path), 'r', encoding='utf-8') as fh:
    reloaded = json.load(fh)

recovered = base64.b64decode(reloaded['archiveBase64'])
if recovered != zip_bytes:
    raise RuntimeError('Round-trip decode mismatch — transport JSON is corrupt')
sha_check = hashlib.sha256(recovered).hexdigest()
if sha_check != sha256:
    raise RuntimeError(f'SHA-256 mismatch after round-trip: {sha_check}')
with zipfile.ZipFile(io.BytesIO(recovered), 'r') as zf_rt:
    bad3 = zf_rt.testzip()
if bad3 is not None:
    raise RuntimeError(f'Round-trip ZIP validation failed on: {bad3}')

print('ROUND-TRIP OK: Base64 -> decode -> SHA-256 -> testzip() all pass')
print('ALL DONE')
