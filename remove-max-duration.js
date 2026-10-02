const fs = require('fs');
const glob = require('glob');

// We use standard fs.readdirSync to find all files recursively
function getAllFiles(dirPath, arrayOfFiles) {
  files = fs.readdirSync(dirPath);
  arrayOfFiles = arrayOfFiles || [];

  files.forEach(function(file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
    } else {
      arrayOfFiles.push(dirPath + "/" + file);
    }
  });

  return arrayOfFiles;
}

const files = getAllFiles('src/app/api');

files.forEach(file => {
  if (file.endsWith('.ts') || file.endsWith('.tsx')) {
    let content = fs.readFileSync(file, 'utf8');
    if (content.includes('export const maxDuration')) {
      content = content.replace(/export const maxDuration\s*=\s*\d+;?\n?/g, '');
      fs.writeFileSync(file, content);
    }
  }
});
