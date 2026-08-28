import { config } from "node:process";
import { IDownloader, ParDownloader, SeqDownloader } from "./downloaders.js";
import { IConfig } from "./setup.js";
import { getDirectYtUrl, isYouTubeUrl } from "./Websites/yt.js";
import path from "node:path";
import { randomInt } from "node:crypto";

function sanitizeFilename(name: string): string {
    return name.replace(/[<>:"/\\|?*]/g, "_").trim();
}

export class Engine {
    config: IConfig;
    downloader?: IDownloader;

    constructor(config: IConfig) {
        this.config = config;
    }

    checkParrallelSupported(
        url: string,
    ): Promise<{ isSupported: boolean; totalFileSize: number }> {
        return new Promise(async (resolve, _) => {
            const response = await fetch(url, { method: "HEAD" });
            const headers = response.headers;

            if (
                headers.get("content-length") &&
                !isNaN(Number(headers.get("content-length"))) &&
                Number.isInteger(Number(headers.get("content-length"))) &&
                headers.get("accept-ranges") === "bytes"
            ) {
                resolve({
                    isSupported: true,
                    totalFileSize: Number(headers.get("content-length") ?? "0"),
                });
                return;
            }

            resolve({ isSupported: false, totalFileSize: 0 });
        });
    }

    getDownloader(url: string, filepath?: string): Promise<IDownloader> {
        return new Promise(async (resolve, reject) => {
            try {
                let outPath =
                    filepath ??
                    path.join(this.config.defaultDistPath, `${randomInt(10000)}.mp4`);

                if (isYouTubeUrl(url)) {
                    const { video, audio, title } = await getDirectYtUrl(url);

                    outPath =
                        filepath ??
                        path.join(
                            this.config.defaultDistPath,
                            `${sanitizeFilename(title)}.mp4`,
                        );
                    const parrallelStatus = await this.checkParrallelSupported(audio);

                    if (parrallelStatus.isSupported) {
                        resolve(
                            new ParDownloader(
                                audio,
                                outPath,
                                parrallelStatus.totalFileSize,
                                this.config.totalChunks,
                            ),
                        );
                        return;
                    }

                    resolve(new SeqDownloader(audio, outPath));
                    return;
                }

                const parrallelStatus = await this.checkParrallelSupported(url);

                if (parrallelStatus.isSupported) {
                    resolve(
                        new ParDownloader(
                            url,
                            outPath,
                            parrallelStatus.totalFileSize,
                            this.config.totalChunks,
                        ),
                    );
                }

                resolve(new SeqDownloader(url, outPath));
            } catch (e: any) {
                reject(e);
            }
        });
    }

    async setNewDownloader(url: string, filepath?: string) {
        try {
            this.downloader = await this.getDownloader(url, filepath);
        } catch (e: any) {
            console.error(e);
        }
    }

    async startDownloading() {
        try {
            const result = await this.downloader?.download();
            console.log(result);
        } catch (e: any) {
            console.error(e);
        }
    }
}
