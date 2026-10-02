const fs = require('fs');

// 1. Fix FlowCanvas dynamic import
const shellFile = 'src/components/flows/flow-editor-shell.tsx';
let shellContent = fs.readFileSync(shellFile, 'utf8');
shellContent = shellContent.replace(
  /\(\) => import\("\.\/flow-canvas"\)\.then\(\(m\) => m\.FlowCanvas\)/,
  '() => import("./flow-canvas")'
);
fs.writeFileSync(shellFile, shellContent);

const canvasFile = 'src/components/flows/flow-canvas.tsx';
let canvasContent = fs.readFileSync(canvasFile, 'utf8');
if (!canvasContent.includes('export default FlowCanvas;')) {
  canvasContent += '\nexport default FlowCanvas;\n';
  fs.writeFileSync(canvasFile, canvasContent);
}

// 2. Add maxDuration
const addMaxDuration = (file) => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    if (!content.includes('export const maxDuration')) {
      content = content.replace(/^(import .*)/m, "export const maxDuration = 60;\n$1");
      fs.writeFileSync(file, content);
    }
  }
};
addMaxDuration('src/app/api/flows/cron/route.ts');
addMaxDuration('src/app/api/ai/knowledge/reindex/route.ts');
