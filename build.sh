#!/bin/bash
# Usage: ./build.sh [-s] [-f <shader-file>]
# -s: Serve the dist directory
# -f: Specify shader file to build

# Exit on error
set -e

# Default values
SERVE=false
SHADER_FILE=""

# Parse command line arguments
while getopts "sf:" opt; do
  case $opt in
    s) SERVE=true ;;
    f) SHADER_FILE="$OPTARG" ;;
    \?) echo "Invalid option: -$OPTARG" >&2; exit 1 ;;
  esac
done

echo "Starting build process..."

# Clean npm
echo "Cleaning npm..."
npm run clean

# Build shaders
echo "Building shaders..."
if [ -n "$SHADER_FILE" ]; then
    node build-shader.js -f "$SHADER_FILE"
else
    node build-shader.js
fi

# Build npm
echo "Building npm package..."
npm run build

echo "Build completed successfully!"

# Serve if -s flag was provided
if [ "$SERVE" = true ]; then
    echo "Serving dist directory..."
    serve dist
fi
