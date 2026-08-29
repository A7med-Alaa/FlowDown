import { IDownloader, ParDownloader, SeqDownloader } from "../Utilities/downloaders.js";
import { IConfig } from "../Utilities/setup.js";
import { getDirectYtUrl, isYouTubeUrl } from "../Websites/yt.js";
import path from "node:path";
import cmdHandler from "./command-handler.js";

function sanitizeFilename(name: string): string {
    return name.replace(/[<>:"/\\|?*]/g, "_").trim();
}

export class Engine {
    config: IConfig;
    downloader: IDownloader | undefined = undefined;

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

    async detectCustomFileName(link: string): Promise<string> {
        const url = new URL(link);
        const lastSlash = url.pathname.lastIndexOf("/");
        const name = decodeURIComponent(url.pathname.substring(lastSlash + 1));

        const answer = await cmdHandler.addQuestion({
            question: `Detected file name: '${name}'. Use it? (Yes or No): `,
            answer: "NONE",
            resolve: () => {}
        });

        if (answer === "YES") return name;

        //TODO: check content-decomposition header might contain file name

        return `${Math.random() * 10000}.mp4`;
    }

    getDownloader(url: string, filename?: string): Promise<IDownloader> {
        return new Promise(async (resolve, reject) => {
            try {
                const customFileName = filename
                    ? sanitizeFilename(filename)
                    : await this.detectCustomFileName(url);
                let outPath = path.join(this.config.defaultDistPath, customFileName);

                if (isYouTubeUrl(url)) {
                    const { audio, title } = await getDirectYtUrl(url);

                    outPath = filename
                        ? outPath
                        : path.join(this.config.defaultDistPath, sanitizeFilename(title));

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
                        console.log("Added " + path.basename(outPath));
                        return;
                    }

                    resolve(new SeqDownloader(audio, outPath));
                    console.log("Added " + path.basename(outPath));
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
                    console.log("Added " + customFileName);
                    return;
                }

                resolve(new SeqDownloader(url, outPath));
                console.log("Added " + customFileName);
            } catch (e: any) {
                reject(e);
            }
        });
    }

    async addDownloader(url: string, filename?: string) {
        try {
            this.downloader = await this.getDownloader(url, filename);
        } catch (e: any) {
            console.error(e);
        }
    }

    async startDownloading() {
        try {
            if (!this.downloader) {
                console.log("Downloader is not added yet.");
                return;
            }
            const result = await this.downloader?.download();
            console.log(result + '\n');
        } catch (e: any) {
            console.error(e);
        }
    }
}
