const readline = require('readline');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

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

/**
 * Print to console or redirect to file
 * @param {array} output output of the command
 * @param {Object} param1 redirection arguments
 * @param {string} param1.operation type of redirection: write | append
 * @param {string} param1.filePath
 */
async function redirect(output, { operation, filePath }) {
    if (operation && filePath) {
        const expandedFilePath = expandTilde(filePath);
        try {
            await fs.promises.writeFile(expandedFilePath, output, { encoding: 'utf8' });
        } catch {}
        return;
    }
}

function joinSentence(outputs) {
    let finalSentence = outputs.join('\n');

    if (finalSentence.endsWith('\n')) {
        finalSentence = finalSentence.slice(0, -1);
    }
    return finalSentence;
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

            const command = [];
            const redirectionArgs = splitTokens(answer, command);

            const args = command.slice(1);
            const paths = process.env.PATH || [];
            let outputs = [];
            let errors = [];

            switch (command[0]) {
                case 'exit': {
                    return rl.close();
                }
                case 'echo': {
                    outputs.push(args.join(' '));
                    break;
                }
                case 'type': {
                    const builtins = ['echo', 'exit', 'type', 'pwd', 'cd'];
                    for (const arg of args) {
                        const isBuiltin = builtins.some((builtin) => builtin === arg);
                        if (isBuiltin) {
                            outputs.push(`${arg} is a shell builtin`);
                        } else {
                            const access = await getIsFileAccessible(paths, arg);
                            outputs.push(access ? `${arg} is ${access}` : `${arg}: not found`);
                        }
                    }
                    break;
                }
                case 'pwd': {
                    outputs.push(process.cwd());
                    break;
                }
                case 'cd': {
                    const cd = command[0];
                    const newDirectory = expandTilde(command[1]);
                    if (command.length > 2) {
                        console.error(`${cd}: too many arguments`);
                    } else if (newDirectory && !(await isValidDirectory(newDirectory))) {
                        console.error(`${cd}: ${newDirectory}: No such file or directory`);
                    } else process.chdir(newDirectory || os.homedir());
                    break;
                }
                default: {
                    const executable = command[0];
                    const isExecutable = await getIsFileAccessible(process.env.PATH, executable);

                    if (!isExecutable) {
                        console.error(`${command[0]}: command not found`);
                        resolve(127);
                        return;
                    }

                    const result = spawnSync(`${executable}`, command.slice(1), {
                        encoding: 'utf-8',
                        stdio: ['inherit', 'pipe', 'pipe'],
                    });
                    if (result.stdout) {
                        outputs.push(result.stdout);
                    }
                    if (result.stderr) {
                        errors.push(result.stderr);
                    }
                }
            }
            print(outputs, errors, redirectionArgs);
            resolve();
        });
    });
}

function print(outputs, errors, redirectionArgs) {
    const output = joinSentence(outputs);
    const error = joinSentence(errors);
    if (redirectionArgs.fd === '1') {
        redirect(output, redirectionArgs);
    } else {
        if (output) {
            console.log(output);
        }
    }
    if (redirectionArgs.fd === '2') {
        redirect(error, redirectionArgs);
    } else {
        if (error) {
            console.error(error);
        }
    }
}

function splitTokens(answer, command) {
    let string = '';
    let redirectionArgs = {};
    const tokenRegex =
        // TODO: refactor to replace with a switch case.
        // singlequotes, double quotes, escape, non-quotes-and-space character, space, operator
        /'([^']*)'|"((?:[^"\\]|\\.)*?)"|\\(.?)|((?!\d?>)[^\s'"\\>]+)|(\s+)|((?<fd>\d?)(?<operation>\>+)\s*(?<filePath>.*))/g;
    const matches = answer.matchAll(tokenRegex);

    for (const match of matches) {
        if (match.groups && match.groups.operation && match.groups.filePath) {
            // If the redirection group was matched, extract the parts
            redirectionArgs = {
                fd: match.groups.fd === '' ? '1' : match.groups.fd, // Default fd to '1' if empty
                operation: match.groups.operation,
                filePath: match.groups.filePath,
            };
            // Redirection tokens are not part of the command itself, so do not push to 'command'
        } else if (match[5] === undefined) {
            string += match[1] ?? match[2]?.replace(/\\("|\\)/g, '$1') ?? match[3] ?? match[4];
        } else {
            if (string !== '') {
                command.push(string);
                string = '';
            }
        }
    }

    if (string) {
        command.push(string);
    }
    return redirectionArgs;
}

/**
 * Check if file is accessible and log success output
 * @param {array} paths - array of path directories
 * @param {string} text - name of the command
 * @returns {bool} state of accessibility
 */
async function getIsFileAccessible(paths, text) {
    for (const dir of paths.split(path.delimiter)) {
        const expandedDirectoryName = expandTilde(dir);
        if (await isValidDirectory(expandedDirectoryName)) {
            const filePath = expandedDirectoryName + `/${text}`;
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
