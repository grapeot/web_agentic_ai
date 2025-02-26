document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const chatMessages = document.getElementById('chat-messages');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const temperatureSlider = document.getElementById('temperature');
    const tempValue = document.getElementById('temp-value');
    const maxTokensSlider = document.getElementById('max-tokens');
    const tokensValue = document.getElementById('tokens-value');
    const thinkingModeSwitch = document.getElementById('thinking-mode');
    const thinkingBudgetSlider = document.getElementById('thinking-budget');
    const budgetValue = document.getElementById('budget-value');
    const autoExecuteToolsSwitch = document.getElementById('auto-execute-tools');
    const clearChatButton = document.getElementById('clear-chat');
    const responseSpinner = document.getElementById('response-spinner');
    const toolsSpinner = document.getElementById('tools-spinner');
    const toolsGroup = document.getElementById('tools-group');
    const toolResultModal = new bootstrap.Modal(document.getElementById('toolResultModal'));
    const toolResultTextarea = document.getElementById('toolResult');
    const submitToolResultButton = document.getElementById('submitToolResult');
    const autoExecutionIndicator = document.getElementById('auto-execution-indicator');
    const cancelAutoExecutionButton = document.getElementById('cancel-auto-execution');

    // State
    let conversationId = null;
    let currentToolUseId = null;
    let messages = [];
    let waitingForToolResult = false;
    let isAutoExecutingTools = false;
    let pollingInterval = null;
    
    // API endpoint - dynamically get current host
    const API_URL = window.location.origin;

    // Initialize
    fetchAvailableTools();
    
    // Event listeners
    temperatureSlider.addEventListener('input', function() {
        tempValue.textContent = this.value;
    });
    
    maxTokensSlider.addEventListener('input', function() {
        tokensValue.textContent = this.value;
    });
    
    thinkingBudgetSlider.addEventListener('input', function() {
        budgetValue.textContent = this.value;
    });
    
    clearChatButton.addEventListener('click', function() {
        chatMessages.innerHTML = '';
        messages = [];
        conversationId = null;
    });
    
    sendButton.addEventListener('click', sendMessage);
    userInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    submitToolResultButton.addEventListener('click', function() {
        const toolResult = toolResultTextarea.value;
        if (toolResult && currentToolUseId) {
            submitToolResult(currentToolUseId, toolResult);
            toolResultModal.hide();
        }
    });
    
    // 添加取消自动执行的事件监听器
    cancelAutoExecutionButton.addEventListener('click', function() {
        if (isAutoExecutingTools) {
            isAutoExecutingTools = false;
            if (pollingInterval) {
                clearInterval(pollingInterval);
                pollingInterval = null;
            }
            autoExecutionIndicator.style.display = 'none';
            addMessageToChat('system', '已取消自动工具执行');
        }
    });

    // Functions
    function fetchAvailableTools() {
        toolsSpinner.style.display = 'block';
        fetch(`${API_URL}/api/tools`)
            .then(response => response.json())
            .then(data => {
                toolsSpinner.style.display = 'none';
                const tools = data.tools;
                tools.forEach(tool => {
                    const li = document.createElement('li');
                    li.className = 'list-group-item';
                    li.innerHTML = `<strong>${tool.name}</strong>: ${tool.description}`;
                    toolsGroup.appendChild(li);
                });
            })
            .catch(error => {
                toolsSpinner.style.display = 'none';
                console.error('Error fetching tools:', error);
            });
    }

    function sendMessage() {
        const message = userInput.value.trim();
        if (!message) return;
        
        addMessageToChat('user', message);
        userInput.value = '';
        
        const requestBody = {
            messages: buildMessagesForAPI(message),
            temperature: parseFloat(temperatureSlider.value),
            max_tokens: parseInt(maxTokensSlider.value),
            thinking_mode: thinkingModeSwitch.checked,
            thinking_budget_tokens: parseInt(thinkingBudgetSlider.value),
            auto_execute_tools: autoExecuteToolsSwitch.checked
        };
        
        responseSpinner.style.display = 'block';
        fetch(`${API_URL}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        })
        .then(response => response.json())
        .then(data => {
            responseSpinner.style.display = 'none';
            
            // Update conversation ID
            if (data.conversation_id) {
                conversationId = data.conversation_id;
            }
            
            // If thinking is provided, show it
            if (data.thinking) {
                addThinkingToChat(data.thinking);
            }
            
            // Check if message exists
            if (data.message && data.message.content) {
                // Process message content
                processAssistantMessage(data.message.content);
            } else {
                // Handle case where message is not present
                console.error('Response missing message field:', data);
                addMessageToChat('assistant', 'Error: Failed to get a proper response from Claude. Please try again.');
            }
            
            // Check if there are tool calls
            if (data.tool_calls && data.tool_calls.length > 0) {
                const toolCall = data.tool_calls[0];
                addToolCallToChat(toolCall);
                
                // Store the tool use ID
                currentToolUseId = toolCall.id;
                
                // 如果启用了自动执行工具，不显示工具结果输入模态框，而是开始轮询
                if (autoExecuteToolsSwitch.checked) {
                    isAutoExecutingTools = true;
                    waitingForToolResult = false;
                    addMessageToChat('system', `开始自动执行 ${toolCall.name} 工具...`);
                    startPollingForUpdates();
                } else {
                    // 手动模式，显示工具结果输入对话框
                    waitingForToolResult = true;
                    toolResultTextarea.value = '';
                    toolResultModal.show();
                }
            }
        })
        .catch(error => {
            responseSpinner.style.display = 'none';
            console.error('Error sending message:', error);
        });
    }
    
    function submitToolResult(toolUseId, result) {
        addToolResultToChat(result);
        
        const requestBody = {
            tool_use_id: toolUseId,
            content: result
        };
        
        responseSpinner.style.display = 'block';
        fetch(`${API_URL}/api/tool-results?conversation_id=${conversationId}&auto_execute_tools=${autoExecuteToolsSwitch.checked}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        })
        .then(response => response.json())
        .then(data => {
            responseSpinner.style.display = 'none';
            
            // Process message content
            processAssistantMessage(data.message.content);
            
            // Check if there are tool calls
            if (data.tool_calls && data.tool_calls.length > 0) {
                waitingForToolResult = true;
                const toolCall = data.tool_calls[0];
                addToolCallToChat(toolCall);
                
                // Store the tool use ID
                currentToolUseId = toolCall.id;
                
                // 如果启用了自动执行工具，不显示工具结果输入模态框，而是开始轮询
                if (autoExecuteToolsSwitch.checked) {
                    isAutoExecutingTools = true;
                    waitingForToolResult = false;
                    addMessageToChat('system', `开始自动执行 ${toolCall.name} 工具...`);
                    startPollingForUpdates();
                } else {
                    // 手动模式，显示工具结果输入对话框
                    waitingForToolResult = true;
                    toolResultTextarea.value = '';
                    toolResultModal.show();
                }
            } else {
                waitingForToolResult = false;
            }
        })
        .catch(error => {
            responseSpinner.style.display = 'none';
            console.error('Error submitting tool result:', error);
        });
    }
    
    function buildMessagesForAPI(userMessage) {
        const apiMessages = [];
        
        // Add any existing conversation history
        if (messages.length > 0) {
            messages.forEach(msg => {
                apiMessages.push(msg);
            });
        }
        
        // Add the new user message
        apiMessages.push({
            role: 'user',
            content: [{
                type: 'text',
                text: userMessage
            }]
        });
        
        return apiMessages;
    }
    
    function processAssistantMessage(content) {
        let textContent = '';
        
        for (const item of content) {
            if (item.type === 'text') {
                textContent += item.text;
            }
        }
        
        if (textContent) {
            addMessageToChat('assistant', textContent);
        }
        
        // Save the assistant message to conversation history
        messages.push({
            role: 'assistant',
            content: content
        });
    }
    
    function addMessageToChat(role, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}-message`;
        messageDiv.innerHTML = marked.parse(content);
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        // Apply syntax highlighting to code blocks
        document.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightBlock(block);
        });
        
        // If this is a user message, add it to history
        if (role === 'user') {
            messages.push({
                role: 'user',
                content: [{
                    type: 'text',
                    text: content
                }]
            });
        }
    }
    
    function addThinkingToChat(thinking) {
        const thinkingDiv = document.createElement('div');
        thinkingDiv.className = 'message thinking';
        thinkingDiv.innerHTML = '<h5>Thinking:</h5>' + marked.parse(thinking);
        chatMessages.appendChild(thinkingDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        // Apply syntax highlighting to code blocks
        document.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightBlock(block);
        });
    }
    
    function addToolCallToChat(toolCall) {
        const toolDiv = document.createElement('div');
        toolDiv.className = 'message tool-call';
        
        const toolHeader = document.createElement('h5');
        toolHeader.textContent = `Tool Call: ${toolCall.name}`;
        toolDiv.appendChild(toolHeader);
        
        const toolInput = document.createElement('div');
        toolInput.className = 'tool-input';
        toolInput.innerHTML = `<pre><code>${JSON.stringify(toolCall.input, null, 2)}</code></pre>`;
        toolDiv.appendChild(toolInput);
        
        chatMessages.appendChild(toolDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        // Apply syntax highlighting to code blocks
        document.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightBlock(block);
        });
    }
    
    function addToolResultToChat(result) {
        const resultDiv = document.createElement('div');
        resultDiv.className = 'message tool-result';
        
        const resultHeader = document.createElement('h5');
        resultHeader.textContent = 'Tool Result:';
        resultDiv.appendChild(resultHeader);
        
        const resultContent = document.createElement('div');
        // Replace newlines with <br> tags and escape HTML to prevent XSS
        const escapedResult = result
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;')
            .replace(/\n/g, '<br>');
            
        resultContent.innerHTML = `<pre><code>${escapedResult}</code></pre>`;
        resultDiv.appendChild(resultContent);
        
        chatMessages.appendChild(resultDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        // Apply syntax highlighting to code blocks
        document.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightBlock(block);
        });
    }

    // 轮询函数：获取会话的新消息
    function startPollingForUpdates() {
        if (pollingInterval) {
            clearInterval(pollingInterval);
        }
        
        if (!conversationId || !isAutoExecutingTools) {
            autoExecutionIndicator.style.display = 'none';
            return;
        }
        
        // 显示自动执行进度指示器
        autoExecutionIndicator.style.display = 'block';
        
        // 每1.5秒检查一次新消息
        pollingInterval = setInterval(() => {
            if (!isAutoExecutingTools) {
                clearInterval(pollingInterval);
                autoExecutionIndicator.style.display = 'none';
                return;
            }
            
            fetch(`${API_URL}/api/conversation/${conversationId}/messages`)
                .then(response => {
                    if (!response.ok) {
                        if (response.status === 404) {
                            console.log("No new messages yet");
                            return null;
                        }
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    if (data && data.messages && data.messages.length > 0) {
                        // 处理新消息
                        updateChatWithNewMessages(data.messages);
                        
                        // 如果对话完成了，停止轮询
                        if (data.status === "completed") {
                            isAutoExecutingTools = false;
                            clearInterval(pollingInterval);
                            autoExecutionIndicator.style.display = 'none';
                        }
                    }
                })
                .catch(error => {
                    console.error("Error polling for updates:", error);
                });
        }, 1500);
    }
    
    // 处理新消息并更新UI
    function updateChatWithNewMessages(newMessages) {
        // 忽略已经处理过的消息
        let lastMessageIndex = messages.length - 1;
        
        // 遍历新消息
        for (let i = lastMessageIndex + 1; i < newMessages.length; i++) {
            const msg = newMessages[i];
            
            if (msg.role === "assistant") {
                // 处理助手消息
                if (msg.content) {
                    processAssistantMessage(msg.content);
                }
            } else if (msg.role === "user" && msg.content && msg.content.length > 0) {
                // 查找工具结果消息
                for (const item of msg.content) {
                    if (item.type === "tool_result") {
                        addToolResultToChat(item.content);
                    }
                }
            }
            
            // 将消息添加到会话历史
            messages.push(msg);
        }
    }
}); 