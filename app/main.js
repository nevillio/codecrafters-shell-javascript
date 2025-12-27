const readline = require('readline');
const fs = require('fs');
const path = require('path');
const os = require('os');

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

async function checkFileAccess(filePath) {
    try {
        await fs.promises.access(filePath, fs.promises.constants.F_OK);
        await fs.promises.access(filePath, fs.promises.constants.X_OK);
        return true;
    } catch (error) {
        return false;
    }
}

async function isValidDirectory(path) {
    try {
        const stats = await fs.promises.stat(path);
        return stats.isDirectory();
    } catch (error) {
        return false;
    }
}

async function prompt() {
    return new Promise((resolve, reject) => {
        rl.question('$ ', async (command) => {
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
                    if (isBuiltin) {
                        console.log(`${text} is a shell builtin`);
                    } else {
                        const paths = process.env.PATH || [];
                        const access = await getIsFileAccessible(paths, text);
                        console.log(access ? `${text} is ${access}` : `${text}: not found`);
                    }
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
/**
 * Check if file is accessible and log success output
 * @param {array} paths - array of path directories
 * @param {string} text - name of the command
 * @returns {bool} state of accessibility
 */
async function getIsFileAccessible(paths, text) {
    for (const dir of paths.split(path.delimiter)) {
        if (await isValidDirectory(dir)) {
            const filePath = expandTilde(dir, text);
            const access = await checkFileAccess(filePath);
            if (access) {
                return filePath;
            }
        }
    }
    return false;
}
function expandTilde(dir, text) {
    let filePath = `${dir}/${text}`;
    if (filePath.startsWith('~')) {
        return path.join(os.homedir(), filePath.slice(1));
    }
    return filePath;
}
