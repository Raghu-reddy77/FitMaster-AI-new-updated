/**
 * FitMaster AI – Interactive Nutrition Assistant Chat Bot
 * Provides intelligent nutrition, calorie, macro, and fitness Q&A with
 * real-time typing animation, localStorage history, and user profile personalization.
 */

let conversationHistory = [];
let userProfile = null;

let isSendingMessage = false;

document.addEventListener('DOMContentLoaded', async () => {
  await loadUserProfileData();
  loadChatHistory();
});

function getChatStorageKey() {
  const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  const userKey = user?.user_id ?? user?.userId ?? user?.id ?? user?.email ?? 'signed-in-user';
  return `fitmaster_bot_chat_${userKey}`;
}

async function loadUserProfileData() {
  try {
    const response = await api.get('/users/profile');
    userProfile = response?.data || null;
    const profile = userProfile?.profile;
    const goals = userProfile?.goal;
    const goalChip = document.getElementById('bot-goal-chip');
    if (goalChip && profile?.fitness_goal) {
      const goalReadable = profile.fitness_goal.replace(/_/g, ' ');
      const cal = goals?.daily_calories;
      goalChip.textContent = `Goal: ${goalReadable}${cal ? ` • ${Math.round(cal)} kcal` : ''}`;
    }
  } catch (error) {
    console.warn('Could not load assistant personalization from the account profile.');
  }
}

function loadChatHistory() {
  const saved = localStorage.getItem(getChatStorageKey());
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      conversationHistory = Array.isArray(parsed)
        ? parsed.filter((message) => ['user', 'bot'].includes(message.sender) && typeof message.text === 'string').slice(-100)
        : [];
    } catch {}
  }
  renderMessages();
}

function saveChatHistory() {
  localStorage.setItem(getChatStorageKey(), JSON.stringify(conversationHistory.slice(-100)));
}

function renderMessages() {
  const container = document.getElementById('chat-messages-container');
  if (!container) return;

  const user = typeof getCurrentUser === 'function' ? getCurrentUser() : JSON.parse(localStorage.getItem('fitmaster_user') || '{}');
  const userInitials = user?.name ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) : 'ME';

  if (conversationHistory.length === 0) {
    container.innerHTML = '<div class="message-row bot"><div class="msg-avatar bot-av">🤖</div><div class="msg-bubble">Ask FitMaster AI about nutrition, meals, workouts, hydration, or fitness recovery.</div></div>';
    return;
  }

  container.innerHTML = conversationHistory.map((msg) => {
    const isUser = msg.sender === 'user';
    const formattedText = formatMarkdown(msg.text);

    return `
      <div class="message-row ${isUser ? 'user' : 'bot'}">
        <div class="msg-avatar ${isUser ? 'user-av' : 'bot-av'}">
          ${isUser ? userInitials : '🤖'}
        </div>
        <div class="msg-bubble">
          <div>${formattedText}</div>
          <div style="font-size: 10px; color: ${isUser ? 'rgba(255,255,255,0.7)' : 'var(--text-dim)'}; margin-top: 6px; text-align: ${isUser ? 'right' : 'left'};">
            ${msg.time || ''}
          </div>
        </div>
      </div>
    `;
  }).join('');

  container.scrollTop = container.scrollHeight;
}

/**
 * Basic markdown parser for bold, lists, and line breaks
 */
function formatMarkdown(text) {
  if (!text) return '';
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // Bullet points
  const lines = html.split('\n');
  let inList = false;
  let formattedLines = [];

  for (let line of lines) {
    if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
      if (!inList) {
        formattedLines.push('<ul>');
        inList = true;
      }
      formattedLines.push(`<li>${line.trim().substring(2)}</li>`);
    } else {
      if (inList) {
        formattedLines.push('</ul>');
        inList = false;
      }
      formattedLines.push(line);
    }
  }
  if (inList) formattedLines.push('</ul>');

  return formattedLines.join('<br>').replace(/<br><ul>/g, '<ul>').replace(/<\/ul><br>/g, '</ul>');
}

/**
 * Handle form submission
 */
window.handleChatSubmit = async function(e) {
  e.preventDefault();
  const input = document.getElementById('chat-user-input');
  const question = input.value.trim();
  if (!question) return;

  input.value = '';
  await processUserMessage(question);
};

window.askQuickPrompt = async function(promptText) {
  await processUserMessage(promptText);
};

async function processUserMessage(question) {
  if (isSendingMessage) return;
  isSendingMessage = true;
  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Add user message
  conversationHistory.push({
    sender: 'user',
    text: question,
    time: timeStr
  });
  renderMessages();
  saveChatHistory();

  const sendButton = document.getElementById('chat-send-btn');
  if (sendButton) sendButton.disabled = true;
  showTyping(true);

  try {
    const history = conversationHistory.slice(0, -1).slice(-6).map((entry) => ({
      role: entry.sender === 'bot' ? 'assistant' : 'user',
      content: entry.text
    }));
    const response = await api.post('/ai/chat', { message: question, history });
    const reply = response?.data?.reply;
    if (typeof reply !== 'string' || !reply.trim()) {
      throw new Error('The assistant returned an empty response. Please try again.');
    }
    showTyping(false);

    conversationHistory.push({
      sender: 'bot',
      text: reply,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });

    renderMessages();
    saveChatHistory();
  } catch (error) {
    showTyping(false);
    showToast('Assistant Unavailable', error.message || 'Please try again in a moment.', 'error');
  } finally {
    isSendingMessage = false;
    if (sendButton) sendButton.disabled = false;
  }
}

function showTyping(show) {
  const typing = document.getElementById('typing-indicator-container');
  const container = document.getElementById('chat-messages-container');
  if (typing) {
    typing.style.display = show ? 'block' : 'none';
  }
  if (container) {
    container.scrollTop = container.scrollHeight;
  }
}

window.clearChatHistory = function() {
  localStorage.removeItem(getChatStorageKey());
  conversationHistory = [];
  loadChatHistory();
  showToast('Chat Cleared', 'Conversation history reset.', 'info');
};

// End of assistant chat controller.
