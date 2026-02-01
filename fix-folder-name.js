import path from 'node:path';
import fs from 'node:fs';

const dirPath = './contents';
const files = fs.readdirSync(dirPath);

for (const file of files) {
  const filepath = path.join(dirPath, file);
  const stats = fs.statSync(filepath);

  if (stats.isDirectory()) {
    let meta;
    try {
      meta = fs.readFileSync(path.join(filepath, 'metadata.txt')).toString();

      // get id from meta
      const match = /.*ID:(.+)\n.*/g.exec(meta);

      if (match[1] && typeof match[1] === 'string') {
        const id = match[1].trim();

        if (!filepath.endsWith(`-${id}`)) {
          const newName = filepath + '-' + id;

          if (fs.existsSync(newName)) {
            console.log('file with new name already exists -> delete', filepath, newName);
            // delete the new one
            fs.rmSync(newName, { recursive: true, force: true });
          }

          // rename the old to new
          fs.renameSync(filepath, newName);
        }
      } else {
        throw new Error('no ID in meta');
      }
    } catch (ex) {
      console.log(`${filepath} has no meta`, ex);
    }
  }
}
