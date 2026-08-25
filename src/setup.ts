import fs from 'fs';
import p from 'path'
import { confirm, path, intro, outro } from '@clack/prompts';

const configPath = p.join(import.meta.dirname, "configs.json");

export interface IConfig {
    defaultDistPath: string,
}

export const defaultConfig: IConfig = {
    defaultDistPath: import.meta.dirname
};

const start = (): Promise<IConfig> => {
    return new Promise(async (resolve, reject) => {
        if(fs.existsSync(configPath)) return reject("Already Exists");
        
        intro("Configuration Setup")    

        const useDefaultConfigs = await confirm({
            message: "Do you want to use the default settings?",
        })

        if(useDefaultConfigs === true) {
            resolve(defaultConfig);
            outro("Setup completed successfully")
            return;
        }

        const distPath = await path({
            message: "Where do you want the default download distination to be at?",
            root: process.cwd(),
            directory: true,
        })

        let builtConfig: IConfig = {
            defaultDistPath: distPath.toString()
        }

        outro("Setup completed")
        
        resolve(builtConfig)
    })
}

export default { start }
