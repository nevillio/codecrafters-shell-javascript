const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

const echoPattern = /^echo\s+(?<text>.*)$/i;
const typePattern = /^type\s+(?<text>.*)$/i;

(async () => {
    for (let i = 0; ; i++) {
        const command = await prompt(i);
        if (command === 'exit') {
            break;
        }
    }
    rl.close();
})();

async function prompt() {
    return new Promise((resolve, reject) => {
        rl.question('$ ', (command) => {
            command = command.trim();
            if (!command) resolve();
            switch (true) {
                case command === 'exit': {
                    resolve('exit');
                    break;
                }
                case command.match(echoPattern) !== null: {
                    const { text } = command.match(echoPattern).groups;
                    console.log(text || '');
                    resolve();
                    break;
                }
                case command.match(typePattern) !== null: {
                    const { text } = command.match(typePattern).groups;
                    const builtins = ['echo', 'exit', 'type'];
                    const isBuiltin = builtins.some((builtin) => builtin === text);
                    console.log(isBuiltin ? `${text} is a shell builtin` : `${text}: not found`);
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
