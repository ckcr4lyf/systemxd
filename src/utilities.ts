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

export const sortCropRecord = (crops: Record<number, number>) => {

    const stringKeys = Object.keys(crops);
    const keys = stringKeys.map(key => parseInt(key));
    let max = keys[0];
    
    for (let i = 0; i < keys.length; i++){
        if (crops[keys[i]] > crops[keys[max]]){
            max = keys[i];
        }
    }

    return max;
}