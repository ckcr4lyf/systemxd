import * as path from 'path';
import * as fs from 'fs';
import crypto from 'crypto';
import { SETTINGS } from '../settings'
import { log } from './utilities';
import { spawnSync } from 'child_process';

const baseScript = fs.readFileSync(path.join(__dirname, '../', SETTINGS.BASE_FILENAME));
const filepath = process.argv[2]; // node ./build/index.js ../ubuntu.iso
const fullPath = path.resolve(process.cwd(), filepath);
const dirPath = path.dirname(fullPath);

const jobId = crypto.randomBytes(4).toString('hex');
log(`Starting job ${jobId}`)
const imagePrefix = `Source_${jobId}`;
// First we ffindex the source
// And make 10 screenshots?

let lines = [];
const loopText = `
src = core.ffms2.Source('${fullPath}')
src = core.resize.Bicubic(src, format=vs.RGB24, matrix_in_s="709")
src = core.imwri.Write(clip=src, imgformat="PNG", filename="${imagePrefix}_%03d.png")
limit = 50000
skip = 5000

for x in range(2000, limit, skip):
    src.get_frame(x)

dummy = core.std.BlankClip(length=1)
dummy.set_output()
`
lines.push(loopText);
const script = baseScript + lines.join('\n');

// Write this script out to a "ffindex.vpy" file and run it
fs.writeFileSync(path.join(dirPath, 'ffindex.vpy'), script);
log(`Saved ffindex.vpy`);
const ffindexCommand = `vspipe ffindex.vpy .`;
const ffindexResult = spawnSync(ffindexCommand, {shell: true, cwd: dirPath});

if (ffindexResult.status !== 0){
    log(`ffindex failed. stderr: ${ffindexResult.stderr.toString()}`);
} else {
    log(ffindexResult.stdout.toString());
}

//Read dir, get files with prefix and pass to image function?