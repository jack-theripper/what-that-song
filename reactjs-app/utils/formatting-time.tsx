
/**
 * Возвращает время в формате HH:MM:SS
 *
 * @return {string}
 */
export const formattingTime = (value: number) => {
    const onlyTimeString = new Date(value * 1000).toISOString().substring(11, 11 + 8);

    return onlyTimeString.indexOf('00:') === 0 ? onlyTimeString.substring(3) : value;
}