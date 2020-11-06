import { sortCropRecord } from '../src/utilities';

const record = { '524': 1, '924': 1, '1080': 5 };

test('Sort record should return the maximum frequency value', () => {
    expect(sortCropRecord(record)).toEqual(1080);
});