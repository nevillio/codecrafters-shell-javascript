const readline = require('readline');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, spawnSync } = require('child_process');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

(async () => {
    for (let i = 0; ; i++) {
        await prompt(i);
    }
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
            const command = answer.split(/\s+/);
            const paths = process.env.PATH || [];
            switch (command[0]) {
                case 'exit': {
                    rl.close();
                    break;
                }
                case 'echo': {
                    console.log(command.slice(1).join(' '));
                    resolve();
                    break;
                }
                case 'type': {
                    const builtins = ['echo', 'exit', 'type', 'pwd', 'cd'];
                    for (const arg of command.slice(1)) {
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
                case 'pwd': {
                    console.log(process.cwd());
                    resolve();
                    break;
                }
                case 'cd': {
                    const cd = command[0];
                    const newDirectory = expandTilde(command[1]);
                    if (command.length > 2) {
                        console.log(`${cd}: too many arguments`);
                    } else if (newDirectory && !(await isValidDirectory(newDirectory))) {
                        console.log(`${cd}: ${newDirectory}: No such file or directory`);
                    } else process.chdir(newDirectory || os.homedir());
                    resolve();
                    break;
                }
                default: {
                    if (
                        spawnSync(`${command[0]}`, command.slice(1), {
                            encoding: 'utf-8',
                            stdio: 'inherit',
                        }).status !== 0
                    )
                        console.log(`${command[0]}: command not found`);
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
            const filePath = expandTilde(dir) + `/${text}`;
            const access = await checkFileAccess(filePath);
            if (access) {
                return filePath;
            }
        }
    }
    return false;
}

function expandTilde(dir) {
    if (!dir) return '';
    if (dir.startsWith('~')) {
        return path.join(os.homedir(), dir.slice(1));
    }
    return dir;
}
