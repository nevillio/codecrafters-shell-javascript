const readline = require("readline");

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

(async () => {
    for (let i = 0; ; i++) {
        try {
            await prompt(i);
        } catch (e) {
            break;
        }
    }
    rl.close();
})();

async function prompt() {
    return new Promise((resolve, reject) => {
        rl.question("$ ", (command) => {
            if (command.trim() === "exit") {
                reject();
            } else {
                console.log(`${command}: command not found`);
                resolve();
            }
        });
    });
}
