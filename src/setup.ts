import fs from "fs";
import p from "path";
import { confirm, path, isCancel, text, intro, outro } from "@clack/prompts";

const configPath = p.join(import.meta.dirname, "configs.json");

export interface IConfig {
    defaultDistPath: string;
    totalChunks: number;
}

export const defaultConfig: IConfig = {
    defaultDistPath: import.meta.dirname,
    totalChunks: 8,
};

const start = (): Promise<IConfig> => {
    return new Promise(async (resolve, reject) => {
        if (fs.existsSync(configPath)) {
            try {
                const content = fs.readFileSync(configPath, { encoding: "utf-8" });
                const parsedConfig = JSON.parse(content);
                console.log(parsedConfig);
                resolve(parsedConfig);
                return;
            } catch (e: any) {
                console.error("Failed to parse config.");
                console.error(e.message);
                fs.rmSync(configPath);
            }
        }

        intro("Configuration Setup");

        const useDefaultConfigs = await confirm({
            message: "Do you want to use the default settings?",
        });

        if (useDefaultConfigs === true) {
            resolve(defaultConfig);
            fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
            outro("Setup completed successfully");
            return;
        }

        const distPath = await path({
            message: "Where do you want the default download distination to be at?",
            root: process.cwd(),
            directory: true,
        });

        if (isCancel(distPath)) {
            console.log("Operation cancelled by user.");
            process.exit(0);
        }

        const numberOfChunks = await text({
            message: "Enter number of chunks to use",
            placeholder: "8",
            initialValue: "8",
            validate: (value) => {
                if (!value) return "Please enter a number.";
                const num = Number(value);
                if (Number.isNaN(num)) return "Must be a valid number.";
                return undefined;
            },
        });

        if (isCancel(numberOfChunks)) {
            console.log("Operation Cancelled By User.");
            process.exit(0);
        }

        let builtConfig: IConfig = {
            defaultDistPath: distPath.toString(),
            totalChunks: Number(numberOfChunks),
        };

        fs.writeFileSync(configPath, JSON.stringify(builtConfig, null, 2));
        outro("Setup completed");

        resolve(builtConfig);
    });
};

export default { start };
