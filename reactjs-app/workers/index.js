const worker = new Worker(new URL('./mp3encoder-worker.js', import.meta.url));

export default worker;