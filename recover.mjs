import fs from 'fs';

const log1 = fs.readFileSync('C:/Users/isaac/.gemini/antigravity/brain/2906ee49-6bcd-44bb-a83e-dd92ff6bbb5b/.system_generated/logs/overview.txt', 'utf8');
const log2 = fs.readFileSync('C:/Users/isaac/.gemini/antigravity/brain/f838ed78-d998-41dd-aa3e-5571a9c4dee9/.system_generated/logs/overview.txt', 'utf8');

let content = fs.readFileSync('client-insights-hub/src/pages/ClientsPage.tsx', 'utf8');
const lines1 = log1.split('\n');
const lines2 = log2.split('\n');

let patches = [];
function collectPatches(logLines) {
  for (let l of logLines) {
    if (!l) continue;
    try {
      let o = JSON.parse(l);
      if (o.tool_calls) {
        for (let t of o.tool_calls) {
          if (t.name && t.name.includes('multi_replace_file_content') && t.args) {
            let args = t.args;
            if (typeof args === 'string') {
               args = JSON.parse(args);
            }
            if (args.TargetFile && args.TargetFile.includes('ClientsPage.tsx')) {
               let chunks = args.ReplacementChunks;
               if (typeof chunks === 'string') chunks = JSON.parse(chunks);
               t.parsedChunks = chunks;
               patches.push(t);
            }
          }
        }
      }
    } catch(e) {}
  }
}

collectPatches(lines1);
collectPatches(lines2);

console.log('Total patches found: ' + patches.length);

// Remove the VERY LAST patch which is the one that corrupted the file
if (patches.length > 0) patches.pop();

for (let t of patches) {
    let chunks = t.parsedChunks || [];
    chunks.sort((a,b) => b.StartLine - a.StartLine);
    let fileLines = content.split('\n');
    for (let chunk of chunks) {
       const startIdx = chunk.StartLine - 1;
       const endIdx = chunk.EndLine;
       const numLinesToRemove = endIdx - startIdx;
       let repContent = chunk.ReplacementContent;
       if (typeof repContent === 'string' && repContent.startsWith('"') && repContent.endsWith('"')) {
           try { repContent = JSON.parse(repContent); } catch(e){}
       }
       // If it's still a JSON encoded string, we unescape it:
       if (typeof repContent === 'string') {
           // We might need to handle newlines properly, but if it was parsed as JSON, the \n are actual newlines
       }
       
       const newLines = repContent.split('\n');
       fileLines.splice(startIdx, numLinesToRemove, ...newLines);
    }
    content = fileLines.join('\n');
}

fs.writeFileSync('client-insights-hub/src/pages/ClientsPage.tsx', content);
console.log('Recovery complete. Applied ' + patches.length + ' patches.');
