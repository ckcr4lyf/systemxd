import { crop } from "./interfaces";

export const log = (message: string) => {
    const timestamp = new Date().toISOString();
    console.log(`${timestamp}: ${message}`)
}

export const calculateCropMode = (cropVals: crop[]) => {

    let topCrops = {};
    let bottomCrops = {};

    for (let crop of cropVals){

        // topCrops[]
    }
}

export const sortCropRecord = (crops: Record<number | string, number>) => {

    const keys = Object.keys(crops);
    let max = keys[0];
    
    for (let i = 0; i < keys.length; i++){
        if (crops[keys[i]] > crops[keys[parseInt(max)]]){
            max = keys[i];
        }
    }

    return parseInt(max);
}