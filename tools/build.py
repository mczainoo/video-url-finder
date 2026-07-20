"""Builds a clean, store-ready copy of the extension into dist/ and zips it.

Excludes dev-only files (node_modules, src/, tools/, package.json, README, ...)
so the artifact only contains what the browser actually needs to run.
"""
import json
import shutil
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / "dist"

INCLUDE = [
    "manifest.json",
    "background.js",
    "common.js",
    "content.js",
    "popup.html",
    "popup.js",
    "popup.css",
    "phosphor.css",
    "fonts",
    "icons",
]


def copy_dist():
    if DIST.exists():
        shutil.rmtree(DIST)
    DIST.mkdir(parents=True)

    for name in INCLUDE:
        src = ROOT / name
        dst = DIST / name
        if src.is_dir():
            shutil.copytree(src, dst)
        else:
            shutil.copy2(src, dst)


def zip_dist(version):
    zip_path = ROOT / f"video-url-finder-v{version}.zip"
    if zip_path.exists():
        zip_path.unlink()

    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for file in sorted(DIST.rglob("*")):
            if file.is_file():
                zf.write(file, file.relative_to(DIST))

    return zip_path


def main():
    manifest = json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))
    version = manifest["version"]

    copy_dist()
    zip_path = zip_dist(version)

    print(f"dist/ built at {DIST}")
    print(f"zip created: {zip_path.name} ({zip_path.stat().st_size / 1024:.1f} KB)")


if __name__ == "__main__":
    main()
