const readline = require('readline');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, spawnSync } = require('child_process');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

const echoPattern = /^echo\s+(?<text>.*)$/i;
const typePattern = /^type\s+(?<text>.*)$/i;
const pattern = /^(?<command>\S+)(?:\s+(?<args>.*))?$/;

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
        rl.question('$ ', async (answer) => {
            answer = answer.trim();
            if (!answer) {
                resolve();
            }
            const { command, args = '' } = answer.match(pattern).groups;
            const paths = process.env.PATH || [];
            switch (true) {
                case command === 'exit': {
                    resolve('exit');
                    break;
                }
                case command === 'echo': {
                    console.log(args || '');
                    resolve();
                    break;
                }
                case command === 'type': {
                    const builtins = ['echo', 'exit', 'type'];
                    for (const arg of args.split(' ')) {
                        const isBuiltin = builtins.some((builtin) => builtin === arg);
                        if (isBuiltin) {
                            console.log(`${arg} is a shell builtin`);
                        } else {
                            const access = await getIsFileAccessible(paths, arg);
                            console.log(access ? `${arg} is ${access}` : `${arg}: not found`);
                        }
                    }
                    resolve();
                    break;
                }
                default: {
                    if (
                        spawnSync(`${command}`, (args && args.split(/\s+/)) || [], {
                            encoding: 'utf-8',
                            stdio: 'inherit',
                        }).status !== 0
                    )
                        console.log(`${command}: command not found`);
                    resolve();
                }
            }
        });
    });
}

async function spawnProcess(command, args) {
    const argsArray = (args.length && args.split(/\s+/)) || [];
    return new Promise((resolve, reject) => {
        const child = spawn(command, argsArray);
        child.stdin.end();
        let stdout = '';
        let stderr = '';

        child.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        child.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        child.on('close', (code) => {
            if (code === 0) {
                resolve(stdout); // Resolve with stdout only
            } else {
                reject(new Error(`Process exited with code ${code}: ${stderr.trim()}`));
            }
        });

        child.on('error', (err) => {
            reject(new Error(`Failed to start child process: ${err.message}`));
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
