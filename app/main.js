const readline = require("readline");

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

const echoPattern = /^echo\s+(?<text>.*)$/i;

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
            command = command.trim();
            if (!command) resolve();
            switch (true) {
                case command === "exit": {
                    resolve("exit");
                    break;
                }
                case command.match(echoPattern) !== null: {
                    const { groups } = command.match(echoPattern);
                    console.log(groups.text || "");
                    resolve();
                    break;
                }
                default: {
                    console.log(`${command}: command not found`);
                    resolve();
                }
            }
        });
    });
}
