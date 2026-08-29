import { Engine } from "./engine.js";
import readline from "readline";

type AvailableCommands = "add" | "start" | "exit" | "help";

interface ICommand {
    cmd: AvailableCommands;
    requiredArgsCount: number;
    help: string;
}

const SupportedCommands: ICommand[] = [
    {
        cmd: "add",
        requiredArgsCount: 1,
        help: "add <URL> <FILENAME?>",
    },
    {
        cmd: "start",
        requiredArgsCount: 0,
        help: "start",
    },
    {
        cmd: "help",
        requiredArgsCount: 1,
        help: "help <COMMAND>",
    },
    {
        cmd: "exit",
        requiredArgsCount: 0,
        help: "exit",
    },
] as const;

export type PendingQuestion = {
    question: string;
    answer: "YES" | "NO" | "NONE";
    resolve: (answer: "YES" | "NO") => void;
};

const pendingQuestions: PendingQuestion[] = [];

const printAvailableCommands = () => {
    console.log("Available Commands:\n");
    SupportedCommands.map((s, i) => console.log(`${i + 1}. ` + s.help));
    console.log("");
};

let rl: readline.Interface;

const addQuestion = async (question: PendingQuestion) => {
    return new Promise<"YES" | "NO">((resolve) => {
        pendingQuestions.push({ ...question, resolve });
        console.log(question.question);
    });
};

const start = (engine: Engine) => {
    rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: "",
    });
    rl.prompt();

    rl.on("line", (v) => {
        const line = v.trim().split(" ");

        if (pendingQuestions.length === 0) {
            handle(line, engine);
        } else {
            if(line[0].trim().toLowerCase() === 'yes' || line[0].trim().toLowerCase() === 'no') {
                const pending = pendingQuestions.shift()!;
                pending.resolve(line[0].trim().toUpperCase() as "YES" | "NO");
            }
        }
        rl.prompt();
    });
};

const handle = (line: string[], engine: Engine) => {
    const cmd = line[0];
    const args: string[] = [];

    for (let i = 1; i < line.length; i++) {
        args.push(line[i]);
    }

    const commandObj = SupportedCommands.find((o) => o.cmd === cmd);

    if (!commandObj || args.length < commandObj.requiredArgsCount) {
        if (commandObj) {
            console.log(commandObj.help);
        } else {
            printAvailableCommands();
        }
        return;
    }

    switch (commandObj.cmd) {
        case "add":
            if (args[1]) engine.addDownloader(args[0].trim(), args[1].trim());
            else engine.addDownloader(args[0].trim());
            break;
        case "start":
            engine.startDownloading();
            break;
        case "help":
            const cmdObj = SupportedCommands.find((v) => v.cmd === args[0].trim());
            console.log(cmdObj ? cmdObj.help : "Invalid command.");
            break;
        case "exit":
            process.exit(0);
        default:
            console.log(commandObj.cmd + " is not implemented yet.");
            break;
    }
};

export default { handle, start, addQuestion, printAvailableCommands };
