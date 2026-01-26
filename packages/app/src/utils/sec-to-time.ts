const pad = (num: number) => num.toString().padStart(2, '0');

export const secToTime = (sec: number): string => {
    const minutes = Math.floor(sec / 60);
    const seconds = Math.floor(sec - minutes * 60);
    return `${pad(minutes)}:${pad(seconds)}`;
}