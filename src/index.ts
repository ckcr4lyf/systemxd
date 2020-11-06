import * as path from 'path';
import * as fs from 'fs';
import jimp, { loadFont } from 'jimp';
import crypto from 'crypto';
import { once } from 'events';
import { spawnSync, spawn } from 'child_process';

import { SETTINGS } from '../settings'
import { rowAverage } from './imageFunctions';
import { log, sortCropRecord } from './utilities';
import { Pixel } from './classes';

(async() => {

    const baseScript = fs.readFileSync(path.join(__dirname, '../', SETTINGS.BASE_FILENAME));
    const filepath = process.argv[2]; // node ./build/index.js ../ubuntu.iso
    const fullPath = path.resolve(process.cwd(), filepath);
    const dirPath = path.dirname(fullPath);

    const jobId = crypto.randomBytes(4).toString('hex');
    log(`Starting job ${jobId}`)
    const imagePrefix = `Source_${jobId}`;

    let lines = [];
    const loopText = `
src = core.ffms2.Source('${fullPath}')
src = core.resize.Bicubic(src, format=vs.RGB24, matrix_in_s="709")
src = core.imwri.Write(clip=src, imgformat="PNG", filename="${imagePrefix}_%03d.png")
limit = len(src)
if limit > 50000:
    limit = 50000
skip = 5000

for x in range(2000, limit, skip):
    src.get_frame(x)

dummy = core.std.BlankClip(length=1)
dummy.set_output()
    `
    lines.push(loopText);
    const script = baseScript + lines.join('\n');

    fs.writeFileSync(path.join(dirPath, 'ffindex.vpy'), script);
    log(`Saved ffindex.vpy`);
    const ffindexCommand = `vspipe ffindex.vpy .`;
    const ffindexResult = spawnSync(ffindexCommand, {shell: true, cwd: dirPath});

    if (ffindexResult.status !== 0){
        log(`ffindex failed. stderr: ${ffindexResult.stderr.toString()}`);
    } else {
        log(ffindexResult.stdout.toString());
    }

    const filesInDir = fs.readdirSync(dirPath);
    const screenshots = filesInDir.filter(filename => filename.startsWith(imagePrefix));
    log(`Starting black border detection...`);

    let cropVals = {top: 0, bottom: 0}
    let topCrops: Record<number, number> = {};
    let bottomCrops: Record<number, number> = {};
    let HEIGHT = 0, WIDTH = 0;

    for (let screenshot of screenshots){
        
        let image = await jimp.read(path.join(dirPath, screenshot));
        HEIGHT = image.bitmap.height;
        WIDTH = image.bitmap.width;
        let crop = {top: 0, bottom: 0};

        //Get top black border
        let y = 0;
        let blackFlag = true;
        let previousRow = rowAverage(image, 0);

        while (y < HEIGHT && blackFlag === true){
            const row = rowAverage(image, y);
            
            if (Math.abs(row.net - previousRow.net) > SETTINGS.ROW_TO_ROW_THRESHOLD){
                log(`[${screenshot}] Row #${y}: Found an average delta greater than threshold!`);
                log(`[${screenshot}] Previous row: ${previousRow.toString()}`);
                log(`[${screenshot}] Current row: ${row.toString()}`);
                blackFlag = false;
            }

            previousRow = row;
            y++;
        }

        y--;
        crop.top = y;

        if (crop.top % 2 === 0){
            log(`[${screenshot}] Black border at top is ${crop.top} pixels tall`);
        } else {
            log(`[${screenshot}] Black border at top is ${++crop.top} pixels tall (rounded up due to odd crop)`);
        }

        topCrops[crop.top] = topCrops[crop.top] + 1 || 1;

        //Get bottom black border
        y = HEIGHT - 1;
        blackFlag = true;
        previousRow = rowAverage(image, y);

        while (y > 0 && blackFlag === true){
            const row = rowAverage(image, y);

            if (Math.abs(row.net - previousRow.net) > SETTINGS.ROW_TO_ROW_THRESHOLD){
                log(`[${screenshot}] Row #${y}: Found an average delta greater than threshold!`);
                log(`[${screenshot}] Previous row: ${previousRow.toString()}`);
                log(`[${screenshot}] Current row: ${row.toString()}`);
                blackFlag = false;
            }

            previousRow = row;
            y--;
        }

        y++;
        crop.bottom = HEIGHT - (y + 1);

        if (crop.bottom % 2 === 0){
            log(`[${screenshot}] Black border at bottom is ${crop.bottom} pixels tall`);
        } else {
            log(`[${screenshot}] Black border at bottom is ${++crop.bottom} pixels tall (rounded up due to odd crop)`);
        }

        bottomCrops[crop.bottom] = bottomCrops[crop.bottom] + 1 || 1;
    }

    let topMax = sortCropRecord(topCrops);
    let bottomMax = sortCropRecord(bottomCrops);
    log(`Max at top is ${topMax} with a count of ${topCrops[topMax]}`);
    log(`Max at bottom is ${bottomMax} with a count of ${bottomCrops[bottomMax]}`);

    if (HEIGHT - topMax > 10){
        cropVals.top = topMax
    }

    if (HEIGHT - bottomMax > 10){
        cropVals.bottom = bottomMax;
    }

    log(`Final crop values are: TOP=${cropVals.top}, BOTTOM=${cropVals.bottom}`);

    //Start test encodes
const testText = `
src = core.ffms2.Source('${fullPath}')
src = core.std.Crop(clip=src, left=0, right=0, top=${cropVals.top}, bottom=${cropVals.bottom})
src = sgf.SelectRangeEvery(clip=src, every=3000, length=50, offset=10000)
src.set_output()
`

    const testScript = baseScript + '\n' + testText;
    fs.writeFileSync(path.join(dirPath, `test_script_${jobId}.vpy`), testScript);
    log(`Saved test script`);

    let crf = 17.0;
    let bitrate = 0.0;
    let diff = Math.abs(SETTINGS.TARGET_BITRATE -  bitrate);
    let adjust = 0;
    log(`Beginning CRF calibration...`);

    while (diff > SETTINGS.TOLERANCE){
        const test_x264_command = `vspipe --y4m test_script_${jobId}.vpy - | x264 --demuxer y4m  --preset veryslow --level 41 --vbv-bufsize 78125 --vbv-maxrate 62500 --merange 32 --bframes 16 --deblock -3:-3 --no-fast-pskip --rc-lookahead 250 --qcomp 0.65 --psy-rd 1.00:0.00 --aq-mode 2 --aq-strength 1.00 --crf ${crf} - --output Test_Encode_${jobId}_CRF${crf}.mkv`;
        log(`Starting x264 test for CRF=${crf}`)
        let x264Log: string[] = [];

        let x264 = spawn(test_x264_command, {
            shell: true
        });
    
        x264.stderr.on('data', data => {
            const str = data.toString();
            if (str.indexOf('fps') !== -1){
                process.stdout.clearLine(0);
                process.stdout.cursorTo(0);
                process.stdout.write(str);
            } else if (str.indexOf('x264 [info]:') !== -1){
                x264Log.push(str.trim());
            } else {    
                console.log(`${new Date().toISOString()}: ${data.toString().trim()}`)
            }
        });
    
        await once(x264, 'close');
        const x264LogString = x264Log.join('\n')
        x264Log = x264LogString.split('\n');
        const bitrateLine = x264Log[x264Log.length - 1];
        const position = bitrateLine.indexOf('/s:');
        bitrate = parseFloat(bitrateLine.slice(position + 3));
        diff = Math.abs(SETTINGS.TARGET_BITRATE - bitrate);

        if (diff >= 2000){
            adjust = 2;
        } else if (diff < 2000 && diff > 1000){
            adjust = 0.6;
        } else if (diff <= 1000 && diff > 700){
            adjust = 0.4;
        } else if (diff <= 700 && diff > 500){
            adjust = 0.2
        } else {
            log(`Found optimal CRF=${crf}!`);
            break;
        }
    
        if (bitrate > SETTINGS.TARGET_BITRATE){
            crf += adjust; //Increase CRF to decrease bitrate
        } else {
            crf -= adjust;
        }
    }
})();