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
    let lastToolCallId = null; // Store the last tool call ID for result association
    
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
        currentToolUseId = null;
        waitingForToolResult = false;
        isAutoExecutingTools = false;
        
        if (pollingInterval) {
            clearInterval(pollingInterval);
            pollingInterval = null;
        }
        
        autoExecutionIndicator.style.display = 'none';
        console.log("Chat cleared, all state reset");
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
    
    // Add cancel auto-execution event listener
    cancelAutoExecutionButton.addEventListener('click', function() {
        if (isAutoExecutingTools) {
            isAutoExecutingTools = false;
            if (pollingInterval) {
                clearInterval(pollingInterval);
                pollingInterval = null;
            }
            autoExecutionIndicator.style.display = 'none';
            
            addMessageToChat('system', 'Auto tool execution cancelled');
        }
    });

    // Add event delegation for chat messages area to handle collapsible tool calls
    chatMessages.addEventListener('click', function(e) {
        // Find the closest tool call header element
        const toolHeader = e.target.closest('.tool-call-header');
        if (toolHeader) {
            const toolCall = toolHeader.closest('.tool-call');
            if (toolCall) {
                const toolContent = toolCall.querySelector('.tool-content');
                if (toolContent) {
                    // Toggle expand/collapse state
                    toolContent.classList.toggle('collapsed');
                    
                    // Update arrow icon
                    const arrow = toolHeader.querySelector('.toggle-arrow');
                    if (arrow) {
                        if (toolContent.classList.contains('collapsed')) {
                            arrow.innerHTML = '&#9654;'; // Right arrow (expand)
                        } else {
                            arrow.innerHTML = '&#9660;'; // Down arrow (collapse)
                        }
                    }
                }
            }
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
        
        // 基础API端点
        let apiEndpoint = `${API_URL}/api/chat`;
        
        // 如果有会话ID，通过URL参数传递
        if (conversationId) {
            apiEndpoint += `?conversation_id=${encodeURIComponent(conversationId)}`;
            console.log("Continuing conversation:", conversationId);
        }
        
        let requestOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        };
        
        fetch(apiEndpoint, requestOptions)
        .then(response => response.json())
        .then(data => {
            responseSpinner.style.display = 'none';
            
            if (data.conversation_id) {
                conversationId = data.conversation_id;
            }
            
            if (data.thinking) {
                addThinkingToChat(data.thinking);
            }
            
            if (data.message && data.message.content) {
                processAssistantMessage(data.message.content);
            } else {
                console.error('Response missing message field:', data);
                addMessageToChat('assistant', 'Error: Failed to get a proper response from Claude. Please try again.');
            }
            
            if (data.tool_calls && data.tool_calls.length > 0) {
                const toolCall = data.tool_calls[0];
                addToolCallToChat(toolCall);
                
                currentToolUseId = toolCall.id;
                
                if (autoExecuteToolsSwitch.checked) {
                    console.log("Tool calls found in initial response with auto-execute enabled, starting polling");
                    isAutoExecutingTools = true;
                    waitingForToolResult = false;
                    startPollingForUpdates();
                } else {
                    waitingForToolResult = true;
                    toolResultTextarea.value = '';
                    toolResultModal.show();
                }
            } else if (autoExecuteToolsSwitch.checked) {
                console.log("No immediate tool calls, but auto-execute is enabled - starting polling anyway");
                isAutoExecutingTools = true;
                startPollingForUpdates();
            }
        })
        .catch(error => {
            responseSpinner.style.display = 'none';
            console.error('Error sending message:', error);
        });
    }
    
    function submitToolResult(toolUseId, result) {
        addToolResultToChat(result, toolUseId);
        
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
            
            processAssistantMessage(data.message.content);
            
            if (data.tool_calls && data.tool_calls.length > 0) {
                waitingForToolResult = true;
                const toolCall = data.tool_calls[0];
                addToolCallToChat(toolCall);
                
                currentToolUseId = toolCall.id;
                
                if (autoExecuteToolsSwitch.checked) {
                    console.log("Tool calls found with auto-execute enabled, continuing polling");
                    isAutoExecutingTools = true;
                    waitingForToolResult = false;
                    startPollingForUpdates();
                } else {
                    waitingForToolResult = true;
                    toolResultTextarea.value = '';
                    toolResultModal.show();
                }
            } else {
                waitingForToolResult = false;
                if (autoExecuteToolsSwitch.checked) {
                    console.log("No immediate tool calls after tool result, but ensuring polling continues");
                    isAutoExecutingTools = true;
                    startPollingForUpdates();
                }
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
        let toolCalls = [];
        
        const displayedToolIds = new Set();
        document.querySelectorAll('.tool-call').forEach(el => {
            if (el.dataset.toolId) {
                displayedToolIds.add(el.dataset.toolId);
            }
        });
        
        for (const item of content) {
            if (item.type === 'text') {
                textContent += item.text;
            } else if (item.type === 'tool_use' && !displayedToolIds.has(item.id)) {
                toolCalls.push({
                    id: item.id,
                    name: item.name,
                    input: item.input
                });
                displayedToolIds.add(item.id);
                lastToolCallId = item.id;
            }
        }
        
        if (textContent) {
            addMessageToChat('assistant', textContent);
        }
        
        for (const toolCall of toolCalls) {
            addToolCallToChat(toolCall);
        }
        
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
        
        document.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightBlock(block);
        });
        
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
        
        document.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightBlock(block);
        });
    }
    
    function addToolCallToChat(toolCall) {
        const toolCallDiv = document.createElement('div');
        toolCallDiv.className = 'message tool-call';
        toolCallDiv.dataset.toolId = toolCall.id;
        
        const header = document.createElement('div');
        header.className = 'tool-call-header';
        
        const arrow = document.createElement('span');
        arrow.className = 'toggle-arrow';
        arrow.innerHTML = '&#9654;';
        header.appendChild(arrow);
        
        const headerText = document.createElement('span');
        headerText.textContent = `Tool Call: ${toolCall.name}`;
        header.appendChild(headerText);
        
        toolCallDiv.appendChild(header);
        
        const content = document.createElement('div');
        content.className = 'tool-content collapsed';
        
        if (toolCall.input) {
            const inputLabel = document.createElement('div');
            inputLabel.className = 'tool-section-label';
            inputLabel.textContent = 'Input Parameters:';
            content.appendChild(inputLabel);
            
            const toolInput = document.createElement('div');
            toolInput.className = 'tool-input';
            
            try {
                let jsonInput;
                if (typeof toolCall.input === 'string') {
                    jsonInput = JSON.parse(toolCall.input);
                } else {
                    jsonInput = toolCall.input;
                }
                
                const formattedJson = JSON.stringify(jsonInput, null, 2);
                toolInput.innerHTML = `<pre>${formattedJson}</pre>`;
            } catch (e) {
                toolInput.innerHTML = `<pre>${toolCall.input}</pre>`;
            }
            
            content.appendChild(toolInput);
        }
        
        const resultLabel = document.createElement('div');
        resultLabel.className = 'tool-section-label';
        resultLabel.textContent = 'Result:';
        content.appendChild(resultLabel);
        
        const resultContainer = document.createElement('div');
        resultContainer.className = 'tool-result-container';
        resultContainer.dataset.forToolId = toolCall.id;
        
        content.appendChild(resultContainer);
        toolCallDiv.appendChild(content);
        
        chatMessages.appendChild(toolCallDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    function addToolResultToChat(result, toolUseId) {
        const resultContainer = document.querySelector(`.tool-result-container[data-for-tool-id="${toolUseId}"]`);
        
        if (resultContainer) {
            const resultDiv = document.createElement('div');
            resultDiv.className = 'tool-result';
            resultDiv.dataset.resultId = toolUseId;
            
            let resultContent = '';
            try {
                const jsonResult = JSON.parse(result);
                resultContent = `<pre>${JSON.stringify(jsonResult, null, 2)}</pre>`;
            } catch (e) {
                resultContent = `<pre>${result}</pre>`;
            }
            
            resultDiv.innerHTML = resultContent;
            resultContainer.appendChild(resultDiv);
            
            const toolCall = resultContainer.closest('.tool-call');
            if (toolCall) {
                const toolContent = toolCall.querySelector('.tool-content');
                if (toolContent && toolContent.classList.contains('collapsed')) {
                    toolContent.classList.remove('collapsed');
                    
                    const arrow = toolCall.querySelector('.toggle-arrow');
                    if (arrow) {
                        arrow.innerHTML = '&#9660;';
                    }
                }
            }
            
            chatMessages.scrollTop = chatMessages.scrollHeight;
        } else {
            console.warn(`Tool container with ID ${toolUseId} not found, creating standalone result`);
            
            const standAloneResult = document.createElement('div');
            standAloneResult.className = 'message tool-result';
            standAloneResult.dataset.resultId = toolUseId;
            
            let resultContent = '';
            try {
                const jsonResult = JSON.parse(result);
                resultContent = `<pre>${JSON.stringify(jsonResult, null, 2)}</pre>`;
            } catch (e) {
                resultContent = `<pre>${result}</pre>`;
            }
            
            standAloneResult.innerHTML = resultContent;
            chatMessages.appendChild(standAloneResult);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    }

    function escapeHtml(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;')
            .replace(/\n/g, '<br>');
    }

    function startPollingForUpdates() {
        if (pollingInterval) {
            clearInterval(pollingInterval);
            console.log("Cleared existing polling interval");
        }
        
        if (!conversationId || !isAutoExecutingTools) {
            console.log("Not starting polling: conversationId=", conversationId, "isAutoExecuting=", isAutoExecutingTools);
            autoExecutionIndicator.style.display = 'none';
            return;
        }
        
        console.log("Starting to poll for conversation", conversationId);
        
        autoExecutionIndicator.style.display = 'block';
        
        pollingInterval = setInterval(() => {
            if (!isAutoExecutingTools) {
                console.log("Auto execution flag turned off, stopping polling");
                clearInterval(pollingInterval);
                autoExecutionIndicator.style.display = 'none';
                return;
            }
            
            console.log("Polling for updates...");
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
                        console.log("Received new messages, status:", data.status);
                        updateChatWithNewMessages(data.messages);
                        
                        // Even when conversation is marked as complete,
                        // we keep isAutoExecutingTools true to allow continued interaction
                        if (data.status === "completed") {
                            console.log("Conversation marked as complete, stopping polling but keeping auto-execute enabled");
                            clearInterval(pollingInterval);
                            autoExecutionIndicator.style.display = 'none';
                        }
                    } else if (data) {
                        console.log("Received response but no new messages, status:", data.status);
                    }
                })
                .catch(error => {
                    console.error("Error polling for updates:", error);
                });
        }, 5000);
    }
    
    function updateChatWithNewMessages(newMessages) {
        let lastMessageIndex = messages.length - 1;
        
        const displayedToolIds = new Set();
        document.querySelectorAll('.tool-call').forEach(el => {
            if (el.dataset.toolId) {
                displayedToolIds.add(el.dataset.toolId);
            }
        });
        
        const displayedResultIds = new Set();
        document.querySelectorAll('.tool-result').forEach(el => {
            if (el.dataset.resultId) {
                displayedResultIds.add(el.dataset.resultId);
            }
        });
        
        let hasNewToolCalls = false;
        let hasToolResults = false;
        
        for (let i = lastMessageIndex + 1; i < newMessages.length; i++) {
            const msg = newMessages[i];
            
            if (msg.role === "assistant") {
                if (msg.content) {
                    let textContent = '';
                    let hasNewToolCall = false;
                    let newToolCalls = [];
                    
                    for (const item of msg.content) {
                        if (item.type === 'text') {
                            textContent += item.text;
                        } else if (item.type === 'tool_use' && !displayedToolIds.has(item.id)) {
                            displayedToolIds.add(item.id);
                            lastToolCallId = item.id;
                            newToolCalls.push({
                                id: item.id,
                                name: item.name,
                                input: item.input
                            });
                            hasNewToolCall = true;
                            hasNewToolCalls = true;
                        }
                    }
                    
                    if (textContent) {
                        addMessageToChat('assistant', textContent);
                    }
                    
                    for (const toolCall of newToolCalls) {
                        addToolCallToChat(toolCall);
                    }
                    
                    if (textContent || hasNewToolCall) {
                        messages.push(msg);
                    }
                }
            } else if (msg.role === "user" && msg.content && msg.content.length > 0) {
                let hasToolResult = false;
                for (const item of msg.content) {
                    if (item.type === "tool_result" && !displayedResultIds.has(item.tool_use_id)) {
                        displayedResultIds.add(item.tool_use_id);
                        addToolResultToChat(item.content, item.tool_use_id);
                        hasToolResult = true;
                        hasToolResults = true;
                    }
                }
                
                if (hasToolResult) {
                    messages.push(msg);
                }
            }
        }
        
        // If new tool calls are detected, ensure polling continues
        if (hasNewToolCalls) {
            console.log("Found new tool calls, ensuring polling continues");
            isAutoExecutingTools = true;
            autoExecutionIndicator.style.display = 'block';
        }
        
        // If tool results are detected, ensure polling continues for assistant responses
        if (hasToolResults) {
            console.log("Found tool results, ensuring polling continues for assistant response");
            isAutoExecutingTools = true;
            autoExecutionIndicator.style.display = 'block';
        }
    }
}); 