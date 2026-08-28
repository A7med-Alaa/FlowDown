import { Engine } from "./engine.js";
import readline from 'readline'
import setup, { IConfig, defaultConfig } from "./setup.js";

let configs: IConfig = defaultConfig;

async function main() {
    console.clear();
    configs = await setup.start();

    const engine = new Engine(configs);
    // await engine.setNewDownloader("https://www.youtube.com/watch?v=6sYZHPeObfw");
    // await engine.startDownloading();
}

main();
