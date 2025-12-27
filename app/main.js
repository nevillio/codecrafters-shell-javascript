const readline = require("readline");

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

(async () => {
    for (let i = 0; ; i++) {
        await prompt(i);
    }
    rl.close();
})();

async function prompt() {
    return new Promise((resolve) => {
        rl.question("$ ", (command) => {
            console.log(`${command}: command not found`);
            resolve(command);
        });
    });
}
