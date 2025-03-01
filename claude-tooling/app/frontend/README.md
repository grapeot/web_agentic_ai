# Claude Tooling 前端重构

## 项目概述

该项目是一个基于Claude API的聊天工具，支持工具调用、文件生成等功能。当前代码库需要进行重构，以提高代码可维护性和组织结构。

## 重构计划

我们计划将单一的`main.js`文件拆分为多个功能模块：

```
js/
├── modules/
│   ├── config.js      # 配置设置
│   ├── api.js         # API交互
│   ├── state.js       # 状态管理
│   ├── ui.js          # UI渲染
│   ├── events.js      # 事件处理
│   ├── tools.js       # 工具功能
│   ├── filePreview.js # 文件预览功能
│   └── utils.js       # 辅助函数
├── main.js            # 主入口点
└── tests/
    ├── setup.js       # 测试设置
    └── main.test.js   # 功能测试
```

## 当前进度

- [x] 设置测试基础架构：Jest、JSDOM环境、测试用例、运行脚本
- [x] 创建模块目录结构
- [x] 拆分代码到模块：
  - [x] 创建config.js：配置设置
  - [x] 创建api.js：API交互
  - [x] 创建state.js：状态管理
  - [x] 创建ui.js：UI渲染
  - [x] 创建events.js：事件处理
  - [x] 创建tools.js：工具功能
  - [x] 创建filePreview.js：文件预览
  - [x] 创建utils.js：辅助函数
- [x] 更新main.js入口点
- [x] 转换为ES模块格式
- [ ] 运行测试验证功能正确性
- [ ] 补充完整文档

## ES模块转换

为了确保代码在浏览器中正常运行，我们将所有模块从CommonJS格式转换为ES模块格式：

### 转换内容

1. 将所有`require()`语句转换为`import`语句
2. 将`module.exports`转换为`export {}`语句
3. 在HTML中添加`type="module"`属性到脚本标签
4. 更新测试环境兼容性逻辑

### 设计决策

1. **测试环境兼容性**：为了保持测试与浏览器环境的兼容性，我们用条件检测代替了直接的CommonJS导出：
   ```javascript
   // 为了在测试环境中兼容CommonJS
   if (isTestEnvironment) {
     window.testExports = {
       // 导出函数
     };
   }
   ```

2. **模块依赖关系**：确保模块间依赖清晰，避免循环依赖
   - config.js 无依赖
   - state.js 依赖 config.js
   - api.js 依赖 config.js
   - ui.js 依赖 config.js
   - events.js 依赖 state.js, ui.js, api.js, tools.js
   - tools.js 依赖 config.js, state.js, ui.js, api.js
   - filePreview.js 无外部依赖
   - utils.js 无外部依赖
   - main.js 依赖所有模块

3. **初始化流程**：通过main.js中的initApp函数协调模块初始化顺序
   - 首先初始化UI
   - 然后设置事件监听器
   - 最后获取可用工具列表

## 学习内容

1. **ES模块与CommonJS的区别**：
   - ES模块默认是静态的，导入发生在解析阶段
   - CommonJS是动态的，导入发生在运行时
   - ES模块支持顶级await，CommonJS不支持
   - ES模块有更好的树摇（tree-shaking）支持

2. **浏览器中的模块加载**：
   - 浏览器通过`type="module"`属性识别ES模块
   - 模块脚本默认延迟加载（类似defer）
   - 模块导入使用CORS加载
   - 模块只加载和执行一次

3. **测试兼容性**：
   - 测试环境（Node.js）和浏览器环境对模块处理有差异
   - 需要适配两种环境，保持代码一致性
   - Jest测试框架主要支持CommonJS模块

## 下一步计划

1. **测试全面性**：确保所有功能都有测试覆盖
2. **逐步验证功能**：每个模块分别验证功能正确性
3. **优化模块结构**：基于测试反馈调整模块设计
4. **完善错误处理**：增强每个模块的错误处理和恢复能力
5. **文档补充**：为所有公共API添加详细文档

## 测试设置

为确保重构后功能正确性，我们已设置自动化测试：

1. **Jest测试框架** - 用于测试JavaScript代码
2. **JSDOM** - 用于模拟DOM环境
3. **功能测试** - 验证关键功能流程

## 测试与验证

### 运行测试

```bash
# 方法1：使用提供的脚本
./run-tests.sh

# 方法2：手动运行
npm install  # 首次运行时安装依赖
npm test
```

### 主要测试用例

- 应用初始化：验证DOM元素和API调用
- 发送消息：验证用户消息发送和响应显示
- 工具调用：验证工具调用流程和结果处理
- 聊天清除：验证清除聊天功能
- 设置调整：验证设置项更新

## 重构实施步骤

1. **创建模块结构**：首先建立文件夹和空文件
2. **提取共享配置**：创建config.js提取所有配置常量
3. **分离API交互**：将所有API调用移至api.js
4. **实现状态管理**：创建state.js管理应用状态
5. **分离UI渲染**：将DOM操作集中到ui.js
6. **分离工具功能**：将工具相关逻辑移至tools.js
7. **分离事件处理**：将事件监听器和处理逻辑移至events.js
8. **分离文件预览**：将文件预览功能移至filePreview.js
9. **提取辅助函数**：将通用函数提取到utils.js
10. **更新主入口**：更新main.js以导入和初始化模块

每完成一个模块的重构，都会运行测试以确保功能正确性。 