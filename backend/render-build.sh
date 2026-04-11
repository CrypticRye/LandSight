#!/usr/bin/env bash
# Render deployment build script

set -o errexit

echo "Installing Python dependencies..."
pip install -r requirements.txt

echo "Build complete! Ready for deployment."
