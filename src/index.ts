import setup, { IConfig, defaultConfig } from "./setup.js";

let configs: IConfig = defaultConfig;

async function main() {
    configs = await setup.start();
}

main()
