#!/bin/bash

# 切换到前端目录
cd "$(dirname "$0")"

# 检查是否安装了npm
if ! command -v npm &> /dev/null; then
    echo "请先安装npm和Node.js"
    exit 1
fi

# 检查是否安装了依赖
if [ ! -d "node_modules" ]; then
    echo "正在安装依赖..."
    npm install
fi

# 运行测试
echo "正在运行测试..."
npm test

# 输出测试结果状态
TEST_STATUS=$?
if [ $TEST_STATUS -eq 0 ]; then
    echo "✅ 所有测试通过!"
else
    echo "❌ 测试失败，请检查错误信息"
fi

exit $TEST_STATUS 