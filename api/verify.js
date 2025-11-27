// Vercel Serverless Function (Node.js)

// 这是一个简单的授权验证接口，用于测试部署。
// 它只是检查请求方法是否为 POST，并返回一个成功的消息。

module.exports = (req, res) => {
    // 确保客户端使用 POST 方法发送数据 (这是验证请求的常见方式)
    if (req.method !== 'POST') {
        // 如果不是 POST 请求，返回 405 错误
        return res.status(405).json({
            status: 'error',
            message: 'Method Not Allowed. Only POST is accepted.'
        });
    }

    // 假设从客户端接收到的数据 (例如：用户ID和授权码)
    // 实际授权逻辑将在后续步骤添加
    const userId = req.body.userId || 'N/A';
    const authCode = req.body.authCode || 'N/A';

    // 返回一个授权成功的消息，模拟首次部署成功的响应
    res.status(200).json({
        status: 'success',
        authorized: true,
        message: 'API deployed successfully. UserId received: ' + userId
    });
};