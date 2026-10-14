"""Zips a build folder for a portal: index.html at the root, forward slashes in paths.

Windows PowerShell 5.1's Compress-Archive writes backslashes, which break the game once
unpacked on a Linux server; this script does not.

Usage: python scripts/zip-build.py dist-playgama marketing/playgama/out/ball-mania-1.4.0.zip
"""

import os
import sys
import zipfile

root, out = sys.argv[1], sys.argv[2]
os.makedirs(os.path.dirname(out), exist_ok=True)
if os.path.exists(out):
    os.remove(out)
with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as archive:
    for base, _, files in os.walk(root):
        for name in sorted(files):
            if name == "robots.txt":
                continue
            full = os.path.join(base, name)
            archive.write(full, os.path.relpath(full, root).replace(os.sep, "/"))
with zipfile.ZipFile(out) as archive:
    names = archive.namelist()
print(f"{out}: {len(names)} files, {os.path.getsize(out) // 1024} KB")
print("index.html at the root:", "index.html" in names)
print("paths with a backslash:", sum(chr(92) in name for name in names))
