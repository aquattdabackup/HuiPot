# Recover a usable Studio source export

Resolved: the transport JSON in Git revision 3f266fc decoded successfully and passed size, SHA-256, and CRC checks. See [INDEPENDENT_REVIEW.md](INDEPENDENT_REVIEW.md). The diagnosis and recovery prompt below are historical; do not request another copy of the same source.

Date: October 24, 2026 (Asia/Ho_Chi_Minh).

## Received artifact and diagnosis

The user placed `huipot-review-export.zip` in the repository. The matching download is under `C:\Users\luong\Downloads\huipot_lw730q`. Both copies are 477,529 bytes with SHA-256 `20cda3d54a39d5dea2a4e7787ccec0f2bd8855c6c06a65287d72cc9b896571f7`.

.NET ZipArchive failed with `Offset to Central Directory cannot be held in an Int64`. Python's independent ZIP reader failed with `BadZipFile: Bad magic number for central directory`. A recognizable ZIP signature alone does not establish archive validity.

There are 107,666 UTF-8 replacement-character byte sequences (`EF BF BD`), including in binary ZIP header fields. The first entry declares deflate compression. The evidence is consistent with a lossy binary-to-text conversion of the archive; the exact point of corruption is not established. Missing original byte values cannot be reliably reconstructed from replacement characters.

No extraction, source inspection, test execution, or compiler/source comparison was performed. Preserve the damaged copy as received. The prior manifest and Studio results remain report-only. See [integrity evidence](evidence/studio-export-integrity-2026-10-24.json).

## Prompt for Studio

Prepared only. Request a binary-safe representation of the existing export, without repeating the application review workflow.

```text
The downloaded huipot-review-export.zip is corrupt. Both local copies have SHA-256 20cda3d54a39d5dea2a4e7787ccec0f2bd8855c6c06a65287d72cc9b896571f7 and size 477529 bytes. .NET cannot read its central-directory offset; Python raises BadZipFile: Bad magic number for central directory. There are 107666 UTF-8 replacement-character sequences in binary headers/compressed data, consistent with lossy binary-to-text conversion.

Provide the existing source export through a text-safe transport:

1. Locate the actual original ZIP in this Studio project. Validate it with Python zipfile.ZipFile and testzip(); testzip() must return None. If the original is invalid, rebuild only the export archive from the existing unchanged project files, excluding credentials, real .env files, private keys, node_modules, and caches. Then validate again. Do not regenerate app code or rerun the development workflow.
2. Read the valid ZIP as raw binary bytes. Compute SHA-256 from those bytes and encode them with standard Base64. Never decode ZIP bytes as UTF-8.
3. Create a downloadable UTF-8 text file named huipot-review-export.transport.json with these actual fields:
   schema: "huipot-review-export-v1"
   archiveName: "huipot-review-export.zip"
   archiveBytes: the exact binary ZIP length
   sha256: the lowercase hexadecimal SHA-256 of the binary ZIP
   fileCount: the actual number of non-directory entries
   uncompressedBytes: the sum of file entry lengths
   projectUrl: the real Studio project URL, or null if unavailable
   revision: the actual exported revision identifier, or null if unavailable
   archiveBase64: the complete standard Base64 encoding of the binary ZIP
4. Return a working download link/control for that JSON file and the actual ZIP validation result and SHA-256. The JSON must contain real complete data, not placeholders or a manifest alone. Do not paste the large Base64 payload into chat.

Do not change application/contract source, deploy, publish, push to GitHub, or send wallet transactions. If file download is unsupported, state the exact limitation.
```

## Local handling when received

Place the transport JSON in the existing repository or supply it as an accessible attachment. Codex will strictly decode Base64, compare binary size and SHA-256, validate ZIP entries/CRC and safe paths, then extract into a separate review directory without overwriting the checkout or the damaged original. Passing these integrity checks establishes transport consistency, not source provenance or contract safety.
