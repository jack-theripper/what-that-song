import {Region} from "wavesurfer.js/src/plugin/regions";

/**
 * Обработчик изенения размера региона. Ограничивать размер региона в диапазоне {5..15}
 */
export const resizeHandler = function (this: Region, delta: number, direction: string) {
    let start, end;

    if (direction === 'start') {
        start = Math.min(this.start + delta, this.end);
        end = Math.max(this.start + delta, this.end)
    } else {
        start = Math.min(this.end + delta, this.start);
        end = Math.max(this.end + delta, this.start);
    }

    if (end - start > 15 || end - start < 5) {
        this.onDrag(delta);
    } else {
        this.update({start: start, end: end});
    }
}