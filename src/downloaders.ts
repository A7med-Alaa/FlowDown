import fs from "fs/promises";
import path from "path";

export interface IDownloader {
    download: () => Promise<string>;
}

export class SeqDownloader implements IDownloader {
    url: string;
    filePath: string;

    constructor(url: string, filepath: string) {
        this.url = url;
        this.filePath = filepath;
    }

    async download() {
        console.log("Using browser mode");
        return new Promise<string>(async (resolve, reject) => {
            console.time(`${path.basename(this.filePath)} downloaded in`);
            const response = await fetch(this.url);
            const reader = response.body?.getReader();

            if (!reader) {
                throw new Error("Failed to get reader");
            }

            const fileHandle = await fs.open(this.filePath, "w");
            const writer = fileHandle.createWriteStream();

            let errorHappened: string = "";
            writer.on("error", (e) => {
                errorHappened = e.message;
                return;
            });

            writer.on("finish", () => resolve("File Downloaded."));

            while (true) {
                try {
                    const { done, value } = await reader.read();

                    if (done) {
                        writer.end();
                        break;
                    }

                    if (!writer.write(value)) {
                        await new Promise((res) => writer.once("drain", res));
                    }

                    if (errorHappened !== "") {
                        throw Error(errorHappened);
                    }
                } catch (e: any) {
                    writer.destroy();
                    fileHandle.close();
                    reject(e);
                    return;
                }
            }

            console.timeEnd(`${path.basename(this.filePath)} downloaded in`);
        });
    }
}

export class ParDownloader implements IDownloader {
    url: string;
    filePath: string;
    fileSize: number;
    totalChunks: number;

    state: {
        chunks: { start: number; end: number }[];
        totalBytesWritten: number;
    };

    constructor(
        url: string,
        filepath: string,
        filesize: number,
        totalChunks: number,
    ) {
        this.url = url;
        this.filePath = filepath;
        this.fileSize = filesize;
        this.totalChunks = totalChunks;

        this.state = {
            chunks: [],
            totalBytesWritten: 0,
        };
    }

    loadChunks() {
        for (let i = 0; i < this.totalChunks; i++) {
            let start = Math.floor((this.fileSize * i) / this.totalChunks);
            let end = Math.floor((this.fileSize * (i + 1)) / this.totalChunks) - 1;

            this.state.chunks.push({ start, end });
        }
    }

    async download() {
        console.log("Using optimized mode");
        return new Promise<string>(async (resolve, reject) => {
            console.time(`${path.basename(this.filePath)} downloaded in:`);
            this.loadChunks();

            const fileHandle = await fs.open(this.filePath, "w");
            await fileHandle.truncate(this.fileSize);

            const promises = this.state.chunks.map(async (chunk, i) => {
                const response = await fetch(this.url, {
                    method: "GET",
                    headers: {
                        Range: `bytes=${chunk.start}-${chunk.end}`,
                    },
                }).catch((e) => {
                    reject(`Failed to fetch chunk ${i}. ${e.message}`);
                    return;
                });

                if (!response) {
                    reject(`Error: Chunk ${i} response is ${response}`);
                    return;
                }

                const reader = response.body?.getReader();

                if (!reader) {
                    reject("Failed to get a reading stream.");
                    return;
                }

                let currentChunkByteWritten: number = 0;

                while (true) {
                    try {
                        const { done, value } = await reader.read();

                        if (done) break;

                        const { bytesWritten } = await fileHandle.write(
                            value,
                            0,
                            value.byteLength,
                            chunk.start + currentChunkByteWritten,
                        );

                        this.state.totalBytesWritten += bytesWritten;
                        currentChunkByteWritten += bytesWritten
                    } catch (e: any) {
                        reader.cancel();
                        reject(`Failed to download chunk ${i}. ${e.message}`);
                        break;
                    }
                }
            });

            try {
                await Promise.all(promises);
            } catch (e: any) {
                reject(e);
                return;
            }

            if (this.state.totalBytesWritten !== this.fileSize) {
                reject(
                    `File isn't completed.\nBytes Written: ${this.state.totalBytesWritten}\nExpected File Size: ${this.fileSize}`,
                );
                return;
            }

            fileHandle.close();
            resolve("File Downloaded Successfully");
            console.timeEnd(`${path.basename(this.filePath)} downloaded in:`);
        });
    }
}
