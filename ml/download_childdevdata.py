"""Download the official childdevdata source into an ignored raw-data directory.

The repository is cloned rather than scraped so its licence, documentation and
version remain alongside the R data files. No Balsathi records are exported.
"""
from __future__ import annotations

import argparse
import subprocess
from pathlib import Path

SOURCE = "https://github.com/D-score/childdevdata.git"


def download(destination: Path, *, revision: str | None = None) -> None:
    if (destination / ".git").exists():
        subprocess.run(["git", "-C", str(destination), "fetch", "--depth", "1", "origin"], check=True)
        subprocess.run(["git", "-C", str(destination), "reset", "--hard", f"origin/{revision or 'master'}"], check=True)
        return
    destination.parent.mkdir(parents=True, exist_ok=True)
    command = ["git", "clone", "--depth", "1"]
    if revision:
        command.extend(["--branch", revision])
    command.extend([SOURCE, str(destination)])
    subprocess.run(command, check=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--destination", type=Path, default=Path("ml/private-data/childdevdata-source"))
    parser.add_argument("--revision")
    args = parser.parse_args()
    download(args.destination, revision=args.revision)
    print(f"Downloaded childdevdata source to {args.destination}")
