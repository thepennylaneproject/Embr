const fs = require('fs');
const path = require('path');

function getFiles(dir, files = []) {
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      getFiles(fullPath, files);
    } else if (fullPath.endsWith('.ts')) {
      files.push(fullPath);
    }
  }
  return files;
}

const srcDir = '/Users/sarahsahl/Desktop/embr/apps/api/src';
const verticalsDir = path.join(srcDir, 'verticals');
const files = getFiles(verticalsDir);

let fixedCount = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let relativeToSrc = path.relative(path.dirname(file), srcDir);
  if (!relativeToSrc.startsWith('.')) relativeToSrc = './' + relativeToSrc;
  
  const newContent = content
    .replace(/from ['"](\.\.\/)+core\//g, `from '${relativeToSrc}/core/`)
    .replace(/from ['"](\.\.\/)+shared\//g, `from '${relativeToSrc}/shared/`)
    .replace(/from ['"](\.\.\/)+upload\//g, `from '${relativeToSrc}/core/upload/`);
    
  if (content !== newContent) {
    fs.writeFileSync(file, newContent);
    console.log('Fixed:', file);
    fixedCount++;
  }
}

console.log(`Fixed ${fixedCount} files in verticals.`);
