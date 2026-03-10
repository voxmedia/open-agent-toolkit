#!/bin/sh

set -eu

PYTHON_BIN="${PYTHON_BIN:-python3}"

if ! command -v "$PYTHON_BIN" >/dev/null 2>&1; then
  if command -v python >/dev/null 2>&1; then
    PYTHON_BIN="python"
  else
    echo "Python is required to install MkDocs dependencies." >&2
    exit 1
  fi
fi

echo "Installing Python dependencies for {{APP_NAME}}..."
"$PYTHON_BIN" -m pip install -r requirements.txt
echo "Installation successful. You can now run 'mkdocs serve'."
