import { Engine } from "./Core/engine.js";
import setup, { IConfig, defaultConfig } from "./Utilities/setup.js";
import cmdHandler from "./Core/command-handler.js";

let configs: IConfig = defaultConfig;

async function main() {
    console.clear();
    configs = await setup.start();

    const engine = new Engine(configs);
    cmdHandler.start(engine);
    cmdHandler.printAvailableCommands();

}
main();
