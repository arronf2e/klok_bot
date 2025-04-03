import { workerData, parentPort } from 'worker_threads';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import crypto from 'crypto';
import { ethers } from 'ethers';
import axios from 'axios';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 读取问题列表
const MESSAGES = (() => {
    try {
        return fs.readFileSync(path.join(__dirname, 'messages.txt'), 'utf8')
            .split('\n').map(l => l.trim()).filter(l => l);
    } catch (error) {
        console.error(chalk.red('读取问题列表文件失败:'), error.message);
        return [];
    }
})();

// 工具函数
const log = msg => {
    const time = new Date().toLocaleTimeString();
    parentPort.postMessage(`${chalk.gray(`[${time}]`)} ${msg}`);
};

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const THREAD_DELAY = Math.random() * (workerData.MAX_THREAD_DELAY) * 1000; // 随机延迟 0-60 秒
// 初始化合约

// 核心业务流程
async function mainLoop() {
    try {
        log(chalk.yellow(`⇄ 开始登录...，使用代理 ${workerData.proxy || '无'}`));
        const worker = new Worker(workerData);
        await worker.login();
        await delay(5000)
        await worker.checkPoints();
        await worker.getModels();
        await worker.checkSocialTask();
        await delay(5000)
        await worker.createChat();
    } catch (error) {
        console.log(error, 'error')
        log(chalk.red(`流程错误: ${error.data}`));
    }
}

function createApiClient(token, proxy) {
    const axiosConfig = {
        baseURL: workerData.base.api_base_url,
        headers: {
            'x-session-token': token,
            'accept': '*/*',
            'accept-encoding': 'gzip, deflate, br, zstd',
            'accept-language': 'en-US,en;q=0.9',
            'origin': 'https://klokapp.ai',
            'referer': 'https://klokapp.ai/',
            'sec-ch-ua': '"Not(A:Brand";v="99", "Microsoft Edge";v="133", "Chromium";v="133"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-site',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36 Edg/133.0.0.0'
        }
    };

    if (proxy) {
        const isSocksProxy = proxy.includes('socks');

        // Use the appropriate agent based on the proxy type
        if (isSocksProxy) {
            axiosConfig.httpAgent = new SocksProxyAgent(proxy);
            axiosConfig.httpsAgent = new SocksProxyAgent(proxy);
        } else {
            axiosConfig.httpAgent = new HttpsProxyAgent(proxy);
            axiosConfig.httpsAgent = new HttpsProxyAgent(proxy);
        }
    }

    return axios.create(axiosConfig);
}

class Worker {
    constructor(workerData) {
        this.workerData = workerData;
        this.chatList = [];
        this.modelsList = []
        this.threadId = null;
        this.selectModel = null;
        this.chatTitle = null;
        this.wallet = new ethers.Wallet(workerData.privateKey);
        this.client = createApiClient("", workerData.proxy);
        log(chalk.yellow(`👛 钱包 ${this.wallet.address.slice(0, 6)}... 开始运行`));
    }

    async checkPoints() {
        log(chalk.green(`⏳ 获取当前积分信息...`));
        try {
            const response = await this.client.get('/points');
            const pointsData = response.data;
            log(chalk.green(` 聊天积分: ${pointsData.points?.inference || 0}`));
            log(chalk.green(` 邀请积分: ${pointsData.points?.referral || 0}`));
            log(chalk.green(` Mira推特关注积分: ${pointsData.points?.twitter_mira || 0}`));
            log(chalk.green(` Klok推特关注积分: ${pointsData.points?.twitter_klok || 0}`));
            log(chalk.green(` discord关注积分: ${pointsData.points?.discord || 0}`));
            log(chalk.green(` 总积分: ${pointsData.total_points || 0}`));
            log(chalk.green(`========================\x1b[0m\n`));
            return pointsData;
        } catch (error) {
            console.error('获取积分信息失败:', error.response?.status, error.response?.data || error.message);
            return null;
        }
    }

    async checkSocialTask() {
        log(chalk.green(`⏳ 检测社交任务状态...`));
        try {
            log(chalk.green(`⏳ 检测关注Twitter Mira任务状态...`));
            const response = await this.client.get('/points/action/twitter_mira');
            const result = response.data;
            if(!result?.has_completed) {
                await delay(5000)
                log(chalk.green(` ✅ 任务未完成，开始执行关注任务...`));
                await this.client.post('/points/action/twitter_mira');
                log(chalk.green(` ✅ 任务执行完成`));
            }else {
                log(chalk.green(` ✅ Mira关注任务已完成，无需执行`));
            }
        } catch (error) {
            console.error('Mira关注任务执行失败:', error.response?.status, error.response?.data || error.message);
            return null;
        }
        await delay(5000)
        try {
            log(chalk.green(`⏳ 检测关注Twitter Klok任务状态...`));
            const response = await this.client.get('/points/action/twitter_klok');
            const result = response.data;
            if(!result?.has_completed) {
                await delay(5000)
                log(chalk.green(` ✅ 任务未完成，开始执行关注任务...`));
                await this.client.post('/points/action/twitter_klok');
                log(chalk.green(` ✅ 任务执行完成`));
            }else {
                log(chalk.green(` ✅ Klok关注任务已完成，无需执行`));
            }
        } catch (error) {
            console.error('Klok关注任务执行失败:', error.response?.status, error.response?.data || error.message);
            return null;
        }
        await delay(5000)
        try {
            log(chalk.green(`⏳ 检测关注discord任务状态...`));
            const response = await this.client.get('/points/action/discord');
            const result = response.data;
            if(!result?.has_completed) {
                await delay(5000)
                log(chalk.green(` ✅ 任务未完成，开始执行关注任务...`));
                await this.client.post('/points/action/discord');
                log(chalk.green(` ✅ 任务执行完成`));
            }else {
                log(chalk.green(` ✅ discord关注任务已完成，无需执行`));
            }
        } catch (error) {
            console.error('discord关注任务执行失败:', error.response?.status, error.response?.data || error.message);
            return null;
        }
    }

    async getNonce() {
        // 获取nonce逻辑
        const nonce = ethers.hexlify(ethers.randomBytes(48)).substring(2);
        const messageToSign = [
            `klokapp.ai wants you to sign in with your Ethereum account:`,
            this.wallet.address,
            ``,
            ``,
            `URI: https://klokapp.ai/`,
            `Version: 1`,
            `Chain ID: 1`,
            `Nonce: ${nonce}`,
            `Issued At: ${new Date().toISOString()}`,
        ].join("\n");
        const signature = await this.wallet.signMessage(messageToSign);
        return { signature, messageToSign };
    }

    async login() {
        // 登录逻辑
        const { signature, messageToSign } = await this.getNonce();
        const loginBody = {
            signedMessage: signature,
            message: messageToSign,
            referral_code: workerData.base.referral_code || null,
        };
        log(chalk.green(`🔐 检验钱包签名中...`));
        const logRes = await this.client.post('/verify', loginBody);
        log(chalk.green(`🔐 ✅ 签名校验成功，已登录...`));
        this.client.defaults.headers['x-session-token'] = logRes.data.session_token;
        return logRes.data.session_token;
    }

    async getModels() {
        // 获取模型列表逻辑
        log(chalk.green(`⏳ 加载现有模型...`));
        try {
            const response = await this.client.get('/models');
            const modelData = response.data;
            log(chalk.green(`========================\x1b[0m\n`));
            const modelsList = modelData?.filter(model => model.active)?.map(model => model.name) || [];
            this.modelsList = modelsList
            this.selectModel = modelsList[Math.floor(Math.random() * modelsList.length)];
            log(chalk.green(` ✅ 模型列表加载成功，随机使用模型：${this.selectModel}`));
        } catch (error) {
            console.error('获取模型信息失败:', error.response?.status, error.response?.data || error.message);
            return null;
        }
    }

    async createChat() {
        while (true) {
            if (!this.threadId) {
                this.threadId = crypto.randomUUID();
            }
            const question =
            MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
            log(`❓ 提问: ${question}`);
            const postMessages = this.chatList.concat([
                {
                    role: "user",
                    content: question,
                },
            ])
            const payload = {
                id: this.threadId,
                created_at: new Date().toISOString(),  // 修改为生成当前时间的ISO格式,
                language: 'chinese',
                model: this.selectModel,
                messages: postMessages,
                sources: [],
                title: this.chatTitle || '',
            };
            const response = await this.client.post('/chat', payload);
            log(chalk.green(` ✅ 模型成功回复，${response.data}`));
            this.chatList = this.chatList.concat([{role: 'assistant', content: response.data}]);
            if(!this.chatTitle){
                const title = await this.client.post('/chat/title', {
                    id: this.threadId,
                    language: 'chinese',
                    messages: postMessages,
                    model: this.selectModel,
                });
                this.chatTitle = title.data?.title;
            }
            await this.checkPoints();
            await delay(4000)
            await this.createChat();
        }
    }
}

async function startWithDelay() {
    log(chalk.yellow(`⏳ 线程将在 ${(THREAD_DELAY / 1000).toFixed(1)} 秒后开始...`));
    await new Promise(resolve => setTimeout(resolve, THREAD_DELAY));
    mainLoop();
}

// 替换原来的启动命令
startWithDelay();
