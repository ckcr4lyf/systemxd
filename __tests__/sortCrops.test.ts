import { sortCropRecord } from '../src/utilities.js';
import test from 'ava';

test('sorts record should return the maximum frequency value', t => {
    const record = { '524': 1, '924': 1, '1080': 5 };
    t.deepEqual(sortCropRecord(record), 1080);
})