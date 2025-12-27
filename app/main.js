const readline = require("readline");

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

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
            } else {
                console.log(`${command}: command not found`);
                resolve();
            }
        });
    });
}
