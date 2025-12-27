const readline = require("readline");

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

const echoPattern = /^\s*echo\s+(?<text>.*)$/i;

(async () => {
    for (let i = 0; ; i++) {
        const command = await prompt(i);
        if (command === "exit") {
            break;
        }
    }
    rl.close();
})();

async function prompt() {
    return new Promise((resolve, reject) => {
        rl.question("$ ", (command) => {
            if (command.trim() === "exit") {
                resolve("exit");
            } else if (command.match(echoPattern)) {
                const { groups } = command.match(echoPattern);
                console.log(groups.text || "");
                resolve();
            } else {
                console.log(`${command}: command not found`);
                resolve();
            }
        });
    });
}
