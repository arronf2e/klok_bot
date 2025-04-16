import axios from 'axios';
import { readFileSync } from 'fs';
const config = JSON.parse(readFileSync(new URL('./config.json', import.meta.url)));

// 替换成你的yescaptcha.com的clientKey： https://yescaptcha.com/i/ZWHtlc，打码费用 0.016R/次
const clientKey = config.clientKey || "";

// 固定，不要动
const websiteKey = '6LcZrRMrAAAAAKllb4TLb1CWH2LR7iNOKmT7rt3L'

// 固定，不要动
const websiteURL = 'https://klokapp.ai/'

// 新增post方法
async function post(url, data, headers = {}) {
  try {
    const response = await axios.post(url, data, { headers });
    return response.data;
  } catch (error) {
    console.error('请求失败:', error.response ? error.response.data : error.message);
    throw error;
  }
}

// 新增createTask方法
async function createTask() {
  const yesCaptchaUrl = 'https://api.yescaptcha.com/createTask';
  const taskData = {
    task: {
      type: 'RecaptchaV3TaskProxyLessK1',
      websiteURL,
      websiteKey,
      pageAction: 'WALLET_CONNECT',
    },
    clientKey,
  };
  return await post(yesCaptchaUrl, taskData, {
    'Content-Type': 'application/json'
  });
}

async function getTaskResult(taskId) {
  const yesCaptchaUrl = 'https://api.yescaptcha.com/getTaskResult';
  const taskData = {
    taskId,
    clientKey,
  };
  
  return new Promise(async (resolve, reject) => {
    const checkResult = async () => {
      try {
        const res = await post(yesCaptchaUrl, taskData, {
          'Content-Type': 'application/json'
        });
        
        if (res.status === 'ready') {
          resolve(res);
        } else {
          console.log(`任务状态: ${res.status}, 3秒后重试...`);
          setTimeout(checkResult, 3000);
        }
      } catch (error) {
        reject(error);
      }
    };
    
    await checkResult();
  });
}

export {
  createTask,
  getTaskResult
}
