import jimp from 'jimp';
import { Pixel } from './classes';
import { SETTINGS } from '../settings'

const { BLACK_THRESHOLD, ROW_TO_ROW_THRESHOLD } = SETTINGS;

/**
 * Checks if a given pixel's RGB values make it "BLACK", as per our threshold
 * @param {number} pixel 
 */
export const isBlack = (pixel: number) => {

    const rgbPixel = jimp.intToRGBA(pixel);

    if (rgbPixel.r < BLACK_THRESHOLD && rgbPixel.g < BLACK_THRESHOLD && rgbPixel.b < BLACK_THRESHOLD) {
        return true;
    }

    return false;
}

/**
 * Takes a row and calculates the average pixel r,g,b values across it.
 * @param {*} image An instance of a jimp image
 * @param {number} rowIndex The row index (zero based)
 */
const row_average = (image: any, rowIndex: number) => {

    const WIDTH = image.bitmap.width;

    let row = new Pixel({
        r: 0,
        g: 0,
        b: 0
    });

    for (let x = 0; x < WIDTH; x++){
        const rgb_pixel = jimp.intToRGBA(image.getPixelColor(x, rowIndex));
        row.add(rgb_pixel);
    }

    row.average(WIDTH);
    return row;
}