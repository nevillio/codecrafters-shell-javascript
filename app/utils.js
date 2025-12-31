const fs = require('fs');
const path = require('path');

/**
 * find command in path
 * @param {String} command command
 * @returns full command path
 */
function findCommandInPath(command) {
    const pathDirs = process.env.PATH.split(':');

    for (const dir of pathDirs) {
        const commandPath = path.join(dir, command);

        try {
            // 检查文件是否存在
            if (!fs.existsSync(commandPath)) {
                continue;
            }

            // 检查文件状态
            const stats = fs.statSync(commandPath);

            // Unix-like 系统：检查是否是文件且有可执行权限
            if (stats.isFile() && isExecutable(stats)) {
                return commandPath;
            }
        } catch (error) {
            // 忽略权限错误等，继续检查下一个目录
            continue;
        }
    }

    return undefined;
}

// 检查文件是否具有可执行权限（Unix-like 系统）
function isExecutable(stats) {
    // 获取文件模式
    const mode = stats.mode;

    // 检查用户、组、其他的执行权限
    // 0o111 是八进制的执行权限掩码
    return !!(mode & 0o111);

    // 或者更详细的检查：
    // const isOwnerExecutable = !!(mode & 0o100); // 用户执行权限
    // const isGroupExecutable = !!(mode & 0o010); // 组执行权限
    // const isOtherExecutable = !!(mode & 0o001); // 其他用户执行权限
    // return isOwnerExecutable || isGroupExecutable || isOtherExecutable;
}

/**
 *
 * parses the input to the shell and returns it as a broken up array of words
 * all characters within qoutes are kept as one word regardless of what character they are
 *    ie. the input string "a  \'a \"\'b c" will result in the array => ['a','a "','b','c']
 *
 * @param {String} input
 * @returns {Array<String>}
 */
function parseInput(input) {
    const result = [];
    let word = '';
    let openQuote = '';
    let escapeNext = false;

    for (let i = 0; i < input.length; i++) {
        const char = input[i];

        if (escapeNext) {
            // 处理转义字符
            if (openQuote === '"') {
                // 双引号内：只对 $ ` " \ 和换行符进行转义
                if (char === '$' || char === '`' || char === '"' || char === '\\' || char === '\n') {
                    word += char;
                } else {
                    // 对其他字符，保留反斜杠和字符
                    word += '\\' + char;
                }
            } else if (openQuote === '') {
                // 无双引号：反斜杠转义任何字符
                word += char;
            } else {
                // 单引号内：不应该到这里，因为单引号内不处理转义
                word += '\\' + char;
            }
            escapeNext = false;
        } else if (char === '\\') {
            if (openQuote === "'") {
                // 单引号内：直接添加反斜杠
                word += char;
            } else {
                // 双引号内或无双引号：标记下一个字符需要转义
                escapeNext = true;
            }
        } else if (char === ' ' && openQuote === '') {
            // 空格且不在引号内 → 结束当前参数
            if (word !== '') {
                result.push(word);
                word = '';
            }
        } else if (openQuote === char) {
            // 匹配的结束引号 → 关闭引号
            openQuote = '';
        } else if (openQuote === '' && (char === "'" || char === '"')) {
            // 开始引号
            openQuote = char;
        } else {
            // 普通字符
            word += char;
        }
    }

    // 处理转义标记还在的情况（如末尾的反斜杠）
    if (escapeNext) {
        word += '\\';
    }

    // 处理最后一个参数
    if (word !== '') {
        result.push(word);
    }

    return result;
}

function getCommandNameAndArgs(input) {
    const args = input.match(/(?:[^\s'"]+|'[^']*'|"[^"]*")+/g) || [];
    const commandName = args.shift().replace(/['"]/g, '');
    const cleanedArgs = args.map((arg) => arg.replace(/['"]/g, ''));
    return { commandName, args: cleanedArgs };
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

module.exports = {
    findCommandInPath,
    getCommandNameAndArgs,
    parseInput,
};
