import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distPath = path.resolve(__dirname, 'dist');

const filesToRun = ['tavern-cards', 'blog'];

const runFile = (fileName) => {
    return new Promise((resolve, reject) => {
        const filePath = path.join(distPath, `${fileName}.js`);

        console.log(`Running: ${filePath}`);

        const childProcess = spawn('node', [filePath], {
            stdio: 'inherit', // 继承父进程的stdio，这样可以看到输出
            cwd: __dirname,
        });

        childProcess.on('close', (code) => {
            if (code === 0) {
                console.log(`✓ ${fileName} completed successfully`);
                resolve();
            } else {
                console.error(`✗ ${fileName} exited with code ${code}`);
                reject(new Error(`Process exited with code ${code}`));
            }
        });

        childProcess.on('error', (error) => {
            console.error(`✗ Failed to start ${fileName}:`, error);
            reject(error);
        });
    });
};

// 主函数：依次运行所有文件
const runAll = async () => {
    console.log('Starting code generation tools...\n');

    for (const fileName of filesToRun) {
        try {
            await runFile(fileName);
            console.log(''); // 添加空行分隔
        } catch (error) {
            console.error(`Failed to run ${fileName}:`, error);
            process.exit(1);
        }
    }

    console.log('All code generation tools completed successfully!');
};

// 运行所有文件
runAll().catch((error) => {
    console.error('Error running code generation tools:', error);
    process.exit(1);
});
