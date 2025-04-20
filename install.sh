#!/bin/bash
# Usage: ./install.sh [-f <forge-dir>]
# -f: Specify forge directory

# Exit on error
set -e

# Default values
FORGE_DIR=""

# Parse command line arguments
while getopts "f:" opt; do
  case $opt in
    f) FORGE_DIR="$OPTARG" ;;
    \?) echo "Invalid option: -$OPTARG" >&2; exit 1 ;;
  esac
done

# Check if forge directory is provided
if [ -z "$FORGE_DIR" ]; then
  echo "Error: Forge directory is required"
  exit 1
fi

echo "Starting install process..."
echo "Forge directory: $FORGE_DIR"

# Create package.json from package.json.in with FORGE_INTERNAL set to the provided forge directory
sed "s#FORGE_INTERNAL#$FORGE_DIR#g" package.json.in >| package.json

# Install dependencies
echo "Installing dependencies..."
npm install

echo "Building shader from forge..."
node build-shader.js -f "$FORGE_DIR"

echo "Downloading scene..."
[ -f "scenes/bar.ply" ] || wget https://ronery-assets.fly.storage.tigris.dev/bar.ply -O scenes/bar.ply
 
# echo "Downloading characters..."
[ -f "characters/Kiya-bartending.fbx" ] || wget https://ronery-assets.fly.storage.tigris.dev/Kiya-bartending.fbx -O characters/Kiya-bartending.fbx
[ -f "characters/Kiya-dancing.fbx" ] || wget https://ronery-assets.fly.storage.tigris.dev/Kiya-dancing.fbx -O characters/Kiya-dancing.fbx
[ -f "characters/Kiya-drinking.fbx" ] || wget https://ronery-assets.fly.storage.tigris.dev/Kiya-drinking.fbx -O characters/Kiya-drinking.fbx
[ -f "characters/Kiya-idle.fbx" ] || wget https://ronery-assets.fly.storage.tigris.dev/Kiya-idle.fbx -O characters/Kiya-idle.fbx
[ -f "characters/Kiya-Laughing.fbx" ] || wget https://ronery-assets.fly.storage.tigris.dev/Kiya-Laughing.fbx -O characters/Kiya-Laughing.fbx
[ -f "characters/Kiya-Left-turn.fbx" ] || wget https://ronery-assets.fly.storage.tigris.dev/Kiya-Left-turn.fbx -O characters/Kiya-Left-turn.fbx
[ -f "characters/man-sitting.fbx" ] || wget https://ronery-assets.fly.storage.tigris.dev/man-sitting.fbx -O characters/man-sitting.fbx

# Create symlinks to public/ only if they don't exist
echo "Creating symlinks to public/"
[ ! -L "public/scenes" ] && ln -sf "$(pwd)/scenes" public/scenes
[ ! -L "public/characters" ] && ln -sf "$(pwd)/characters" public/characters
[ ! -L "public/audio" ] && ln -sf "$(pwd)/audio" public/audio

echo "Installation complete"
