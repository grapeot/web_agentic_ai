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
            
            // Remove auto-execution status message
            const statusMsg = document.querySelector('.auto-execution-message');
            if (statusMsg) {
                statusMsg.remove();
            }
            
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
                
                // If auto-execute tools is enabled, don't show the tool result input modal, start polling instead
                if (autoExecuteToolsSwitch.checked) {
                    isAutoExecutingTools = true;
                    waitingForToolResult = false;
                    startPollingForUpdates();
                } else {
                    // Manual mode, show tool result input dialog
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
            
            // Process message content
            processAssistantMessage(data.message.content);
            
            // Check if there are tool calls
            if (data.tool_calls && data.tool_calls.length > 0) {
                waitingForToolResult = true;
                const toolCall = data.tool_calls[0];
                addToolCallToChat(toolCall);
                
                // Store the tool use ID
                currentToolUseId = toolCall.id;
                
                // If auto-execute tools is enabled, don't show the tool result input modal, start polling instead
                if (autoExecuteToolsSwitch.checked) {
                    isAutoExecutingTools = true;
                    waitingForToolResult = false;
                    startPollingForUpdates();
                } else {
                    // Manual mode, show tool result input dialog
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
        
        // Create a set of already displayed tool IDs
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
                // Process tool call - only if not already displayed
                lastToolCallId = item.id;
                addToolCallToChat({
                    id: item.id,
                    name: item.name,
                    input: item.input
                });
                displayedToolIds.add(item.id); // Add to the displayed set
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
        const toolCallDiv = document.createElement('div');
        toolCallDiv.className = 'message tool-call';
        toolCallDiv.dataset.toolId = toolCall.id; // Add tool ID as data attribute
        
        const header = document.createElement('div');
        header.className = 'tool-call-header';
        
        const arrow = document.createElement('span');
        arrow.className = 'toggle-arrow';
        arrow.innerHTML = '&#9654;'; // Right arrow (expand)
        header.appendChild(arrow);
        
        const headerText = document.createElement('span');
        headerText.textContent = `Tool Call: ${toolCall.name}`;
        header.appendChild(headerText);
        
        toolCallDiv.appendChild(header);
        
        const content = document.createElement('div');
        content.className = 'tool-content collapsed';
        
        // Add tool input parameters
        if (toolCall.input) {
            const inputLabel = document.createElement('div');
            inputLabel.className = 'tool-section-label';
            inputLabel.textContent = 'Input Parameters:';
            content.appendChild(inputLabel);
            
            const toolInput = document.createElement('div');
            toolInput.className = 'tool-input';
            
            // Beautify JSON display
            try {
                let jsonInput;
                if (typeof toolCall.input === 'string') {
                    // Try to parse JSON string
                    jsonInput = JSON.parse(toolCall.input);
                } else {
                    // Already an object
                    jsonInput = toolCall.input;
                }
                
                // Use formatted JSON for display
                const formattedJson = JSON.stringify(jsonInput, null, 2);
                toolInput.innerHTML = `<pre>${formattedJson}</pre>`;
            } catch (e) {
                // If not valid JSON or error occurs, display original input
                toolInput.innerHTML = `<pre>${toolCall.input}</pre>`;
            }
            
            content.appendChild(toolInput);
        }
        
        // Create a container for tool results, to be filled later
        const resultLabel = document.createElement('div');
        resultLabel.className = 'tool-section-label';
        resultLabel.textContent = 'Result:';
        content.appendChild(resultLabel);
        
        const resultContainer = document.createElement('div');
        resultContainer.className = 'tool-result-container';
        resultContainer.dataset.forToolId = toolCall.id;
        
        // Add loading indicator
        const loading = document.createElement('div');
        loading.className = 'tool-result-loading';
        loading.innerHTML = '<div class="spinner"></div><p>Executing tool...</p>';
        resultContainer.appendChild(loading);
        
        content.appendChild(resultContainer);
        toolCallDiv.appendChild(content);
        
        chatMessages.appendChild(toolCallDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    function addToolResultToChat(result, toolUseId) {
        // Find the result container for the corresponding tool call
        const resultContainer = document.querySelector(`.tool-result-container[data-for-tool-id="${toolUseId}"]`);
        
        if (resultContainer) {
            // Clear loading state
            resultContainer.innerHTML = '';
            
            // Create result content
            const resultDiv = document.createElement('div');
            resultDiv.className = 'tool-result';
            resultDiv.dataset.resultId = toolUseId;
            
            let resultContent = '';
            try {
                // Try to parse and format JSON
                const jsonResult = JSON.parse(result);
                resultContent = `<pre>${JSON.stringify(jsonResult, null, 2)}</pre>`;
            } catch (e) {
                // If not valid JSON, display original text
                resultContent = `<pre>${result}</pre>`;
            }
            
            resultDiv.innerHTML = resultContent;
            resultContainer.appendChild(resultDiv);
            
            // Auto-expand the tool content when result is received
            const toolCall = resultContainer.closest('.tool-call');
            if (toolCall) {
                const toolContent = toolCall.querySelector('.tool-content');
                if (toolContent && toolContent.classList.contains('collapsed')) {
                    // Remove collapsed class
                    toolContent.classList.remove('collapsed');
                    
                    // Update arrow icon
                    const arrow = toolCall.querySelector('.toggle-arrow');
                    if (arrow) {
                        arrow.innerHTML = '&#9660;'; // Down arrow (collapse)
                    }
                }
            }
            
            // Ensure chat window scrolls to the latest message
            chatMessages.scrollTop = chatMessages.scrollHeight;
        } else {
            // If no corresponding tool call container found, create standalone result
            console.warn(`Tool container with ID ${toolUseId} not found, creating standalone result`);
            
            const standAloneResult = document.createElement('div');
            standAloneResult.className = 'message tool-result';
            standAloneResult.dataset.resultId = toolUseId;
            
            let resultContent = '';
            try {
                // Try to parse and format JSON
                const jsonResult = JSON.parse(result);
                resultContent = `<pre>${JSON.stringify(jsonResult, null, 2)}</pre>`;
            } catch (e) {
                // If not valid JSON, display original text
                resultContent = `<pre>${result}</pre>`;
            }
            
            standAloneResult.innerHTML = resultContent;
            chatMessages.appendChild(standAloneResult);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    }

    // Helper function for HTML escaping
    function escapeHtml(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;')
            .replace(/\n/g, '<br>');
    }

    // Polling function: Get new messages for conversation
    function startPollingForUpdates() {
        if (pollingInterval) {
            clearInterval(pollingInterval);
        }
        
        if (!conversationId || !isAutoExecutingTools) {
            autoExecutionIndicator.style.display = 'none';
            return;
        }
        
        // Show auto-execution progress indicator
        autoExecutionIndicator.style.display = 'block';
        
        // Add status message only once when polling starts
        if (!document.querySelector('.auto-execution-message')) {
            const statusMsg = document.createElement('div');
            statusMsg.className = 'message system-message auto-execution-message';
            statusMsg.textContent = 'Auto-executing tools...';
            chatMessages.appendChild(statusMsg);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
        
        // Check for new messages every 1.5 seconds
        pollingInterval = setInterval(() => {
            if (!isAutoExecutingTools) {
                clearInterval(pollingInterval);
                autoExecutionIndicator.style.display = 'none';
                
                // Remove auto-execution status message
                const statusMsg = document.querySelector('.auto-execution-message');
                if (statusMsg) {
                    statusMsg.remove();
                }
                
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
                        // Process new messages
                        updateChatWithNewMessages(data.messages);
                        
                        // If conversation is completed, stop polling
                        if (data.status === "completed") {
                            isAutoExecutingTools = false;
                            clearInterval(pollingInterval);
                            autoExecutionIndicator.style.display = 'none';
                            
                            // Remove auto-execution status message
                            const statusMsg = document.querySelector('.auto-execution-message');
                            if (statusMsg) {
                                statusMsg.remove();
                            }
                        }
                    }
                })
                .catch(error => {
                    console.error("Error polling for updates:", error);
                });
        }, 1500);
    }
    
    // Process new messages and update UI
    function updateChatWithNewMessages(newMessages) {
        // Ignore already processed messages
        let lastMessageIndex = messages.length - 1;
        
        // Create a set of displayed tool call IDs
        const displayedToolIds = new Set();
        document.querySelectorAll('.tool-call').forEach(el => {
            if (el.dataset.toolId) {
                displayedToolIds.add(el.dataset.toolId);
            }
        });
        
        // Create a set of displayed tool result IDs
        const displayedResultIds = new Set();
        document.querySelectorAll('.tool-result').forEach(el => {
            if (el.dataset.resultId) {
                displayedResultIds.add(el.dataset.resultId);
            }
        });
        
        // Iterate through new messages
        for (let i = lastMessageIndex + 1; i < newMessages.length; i++) {
            const msg = newMessages[i];
            
            if (msg.role === "assistant") {
                // Process assistant messages
                if (msg.content) {
                    let textContent = '';
                    let hasNewToolCall = false;
                    
                    // First check content, filter already displayed tool calls
                    for (const item of msg.content) {
                        if (item.type === 'text') {
                            textContent += item.text;
                        } else if (item.type === 'tool_use' && !displayedToolIds.has(item.id)) {
                            // Only add tool calls not already displayed
                            displayedToolIds.add(item.id);
                            lastToolCallId = item.id;
                            addToolCallToChat({
                                id: item.id,
                                name: item.name,
                                input: item.input
                            });
                            hasNewToolCall = true;
                        }
                    }
                    
                    if (textContent) {
                        addMessageToChat('assistant', textContent);
                    }
                    
                    // Only add message to history if it has new tool calls or text content
                    if (textContent || hasNewToolCall) {
                        messages.push(msg);
                    }
                }
            } else if (msg.role === "user" && msg.content && msg.content.length > 0) {
                // Look for tool result messages
                let hasToolResult = false;
                for (const item of msg.content) {
                    if (item.type === "tool_result" && !displayedResultIds.has(item.tool_use_id)) {
                        displayedResultIds.add(item.tool_use_id);
                        addToolResultToChat(item.content, item.tool_use_id);
                        hasToolResult = true;
                    }
                }
                
                // Only add message to history if it has new tool results
                if (hasToolResult) {
                    messages.push(msg);
                }
            }
        }
    }
}); 