// 引入 MongoDB 驱动程序
const { MongoClient } = require('mongodb');

// 从 Vercel 环境变量中读取连接字符串
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

// 定义数据库和集合名称
const DB_NAME = "license_db"; // 数据库名称，可以自定义
const COLLECTION_NAME = "keys"; // 集合（表）名称

// 授权有效期（示例：30 天，单位为毫秒）
// const DURATION_MS = 30 * 24 * 60 * 60 * 1000;
const DURATION_MS = 30 * 1000; // ⚠️ 临时设置为 30 秒，方便测试

module.exports = async (req, res) => {
    // 确保请求方法是 POST
    if (req.method !== 'POST') {
        return res.status(405).json({
            status: 'error',
            message: 'Method Not Allowed. Only POST is accepted.'
        });
    }

    // 确保请求体存在
    if (!req.body) {
        return res.status(400).json({ status: 'error', message: 'Missing request body.' });
    }

    // 假设客户端发送的数据包含 userId (机器ID) 和 authCode (授权码)
    const userId = req.body.userId || 'N/A';
    const authCode = req.body.authCode;

    if (!authCode) {
        return res.status(400).json({ status: 'error', message: 'Missing authCode.' });
    }

    try {
        await client.connect();
        const database = client.db(DB_NAME);
        const keys = database.collection(COLLECTION_NAME);

        // 1. 查找授权码
        const existingKey = await keys.findOne({ authCode: authCode });

        if (!existingKey) {
            // 授权码不存在
            return res.status(401).json({ status: 'error', message: 'Invalid authorization code.' });
        }

        // --- 授权码存在，开始验证/绑定逻辑 ---

        // 2. 检查授权码是否已绑定到其他机器
        if (existingKey.userId && existingKey.userId !== userId) {
            // 已绑定但机器 ID 不匹配，授权失败
            return res.status(403).json({ status: 'error', message: 'License is bound to another machine.' });
        }

        // 3. 检查授权是否过期
        const now = new Date();
        if (existingKey.expiryDate && existingKey.expiryDate < now) {
            // 授权已过期
            return res.status(403).json({ status: 'error', message: 'License has expired.' });
        }

        // 4. 绑定或更新授权
        if (!existingKey.userId) {
            // 授权码未绑定，进行首次绑定和设置过期时间
            const newExpiryDate = new Date(now.getTime() + DURATION_MS);
            await keys.updateOne(
                { _id: existingKey._id },
                {
                    $set: {
                        userId: userId, // 绑定机器 ID
                        issueDate: now, // 记录首次签发时间
                        expiryDate: newExpiryDate // 设置过期时间
                    }
                }
            );
        }

        // 5. 授权成功
        res.status(200).json({
            status: 'success',
            authorized: true,
            message: 'License verified successfully.',
            userId: userId,
            expiryDate: existingKey.expiryDate || new Date(now.getTime() + DURATION_MS) // 返回过期时间
        });

    } catch (e) {
        console.error("Database connection or query error:", e);
        res.status(500).json({ status: 'error', message: 'Internal server error.', details: e.message });
    } finally {
        // 确保关闭连接
        await client.close();
    }
};