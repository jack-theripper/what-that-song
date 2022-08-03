import {formattingTime} from "./formatting-time";

describe('formatting-time.js', () => {
    test('0 seconds', () => expect(formattingTime(0)).toBe('00:00'));
    test('1 min 40 sec', () => expect(formattingTime(100)).toBe('01:40'));
    test('1 hours', () => expect(formattingTime(3600)).toBe('01:00:00'));
});