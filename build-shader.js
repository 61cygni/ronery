// build-shaders.js
import { build } from 'vite';
import glsl from 'vite-plugin-glsl';
import path from 'path';
import fs from 'fs';

// Default shader input path
let defaultShaderDir = '../forge-internal/';

// Parse command line arguments
const args = process.argv.slice(2);

for (let i = 0; i < args.length; i++) {
  if (args[i] === '-f' && i + 1 < args.length) {
    defaultShaderDir = args[i + 1];
    break;
  }
}

const shaderInput = path.join(defaultShaderDir, 'src/shaders/splatDefines.glsl');

// Create a temporary entry file that imports the shader
const tempDir = '.shader-build-temp';
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

// Create temp entry file
const entryFile = path.join(tempDir, 'entry.js');
fs.writeFileSync(
  entryFile,
  `import shader from '../${shaderInput}';\nexport default shader;`
);

// Run the build
async function buildShader() {
  await build({
    configFile: false,
    build: {
      lib: {
        entry: entryFile,
        formats: ['es'],
        fileName: 'splatDefines'
      },
    outDir: 'src/shaders',
      emptyOutDir: false
    },
    plugins: [glsl()]
  });
  
  // Clean up temp directory
  fs.rmSync(tempDir, { recursive: true });
  
  console.log('Shader compiled and saved to dist/assets/shaders/splatDefines.js');
}

buildShader();