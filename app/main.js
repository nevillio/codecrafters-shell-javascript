const readline = require("readline");

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

(async () => {
    for (let i = 0; ; ) await newFunction();
    rl.close();
})();

async function newFunction() {
    return new Promise((resolve) => {
        rl.question("$ ", async (command) => {
            console.log(`${command}: command not found`);
            resolve(command);
        });
    });
}
