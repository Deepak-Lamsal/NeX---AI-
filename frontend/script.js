const TOKEN_KEY = "nex_token";
let currentConversationId = null;
let isSending = false;

const authView = document.getElementById("auth-view");
const chatView = document.getElementById("chat-view");
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const message = document.getElementById("message");
const conversationList = document.getElementById("conversation-list");
const messagesBox = document.getElementById("messages");
const chatTitle = document.getElementById("chat-title");
const currentUser = document.getElementById("current-user");
const newChatButton = document.getElementById("new-chat");
const logoutButton = document.getElementById("logout");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const sendButton = document.getElementById("send-button");
const chatError = document.getElementById("chat-error");

/* ---------- Helpers ---------- */

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function errorText(data, fallback) {
  return data && typeof data.detail === "string" ? data.detail : fallback;
}

async function api(path, options = {}) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) {
    headers.Authorization = "Bearer " + token;
  }

  let response;
  try {
    response = await fetch(path, { ...options, headers });
  } catch (error) {
    return { ok: false, status: 0, data: null };
  }

  let data = null;
  try {
    data = await response.json();
  } catch (error) {
    data = null;
  }

  if (response.status === 401) {
    logout();
  }
  return { ok: response.ok, status: response.status, data };
}

/* ---------- Switching screens ---------- */

function showForm(name) {
  loginForm.classList.toggle("hidden", name !== "login");
  registerForm.classList.toggle("hidden", name !== "register");
  message.textContent = "";
}

function showAuth() {
  chatView.classList.add("hidden");
  authView.classList.remove("hidden");
}

async function showChat() {
  authView.classList.add("hidden");
  chatView.classList.remove("hidden");

  const me = await api("/auth/me");
  if (!me.ok) {
    return;
  }
  currentUser.textContent = me.data.username;
  showEmpty("Select a chat or start a new one.");
  await loadConversations();
}

function logout() {
  localStorage.removeItem(TOKEN_KEY);
  currentConversationId = null;
  conversationList.replaceChildren();
  messagesBox.replaceChildren();
  chatTitle.textContent = "NeX AI";
  chatInput.value = "";
  chatError.textContent = "";
  showAuth();
}

/* ---------- Chats ---------- */

function showEmpty(text) {
  const note = document.createElement("p");
  note.className = "empty";
  note.textContent = text;
  messagesBox.replaceChildren(note);
}

function addMessage(role, text) {
  const bubble = document.createElement("div");
  bubble.className = "message " + (role === "user" ? "user" : "assistant");
  bubble.textContent = text;
  messagesBox.appendChild(bubble);
  messagesBox.scrollTop = messagesBox.scrollHeight;
}

function makeActionButton(symbol, label, extraClass) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "convo-action" + (extraClass ? " " + extraClass : "");
  button.textContent = symbol;
  button.title = label;
  button.setAttribute("aria-label", label);
  return button;
}

async function loadConversations() {
  const result = await api("/conversations");
  if (!result.ok) {
    return;
  }

  conversationList.replaceChildren();
  for (const convo of result.data) {
    const row = document.createElement("div");
    row.className = "convo-row";
    if (convo.id === currentConversationId) {
      row.classList.add("active");
    }

    const item = document.createElement("button");
    item.type = "button";
    item.className = "convo-item";
    item.textContent = convo.title;
    item.addEventListener("click", () => openConversation(convo.id, convo.title));

    const renameButton = makeActionButton("✎", "Rename chat: " + convo.title);
    renameButton.addEventListener("click", () =>
      renameConversation(convo.id, convo.title)
    );

    const deleteButton = makeActionButton("✕", "Delete chat: " + convo.title, "danger");
    deleteButton.addEventListener("click", () =>
      deleteConversation(convo.id, convo.title)
    );

    row.append(item, renameButton, deleteButton);
    conversationList.appendChild(row);
  }
}

async function renameConversation(id, oldTitle) {
  const input = window.prompt("Rename chat", oldTitle);
  if (input === null) {
    return;
  }

  const title = input.trim();
  if (!title || title === oldTitle) {
    return;
  }

  chatError.textContent = "";
  const result = await api("/conversations/" + id, {
    method: "PATCH",
    body: JSON.stringify({ title }),
  });
  if (result.status === 401) {
    return;
  }

  if (!result.ok) {
    chatError.textContent =
      result.status === 0
        ? "Cannot reach the server."
        : errorText(result.data, "Could not rename the chat. Titles can be up to 100 characters.");
    return;
  }

  if (id === currentConversationId) {
    chatTitle.textContent = result.data.title;
  }
  await loadConversations();
}

async function deleteConversation(id, title) {
  if (isSending) {
    return;
  }
  if (!window.confirm('Delete "' + title + '"? This cannot be undone.')) {
    return;
  }

  chatError.textContent = "";
  const result = await api("/conversations/" + id, { method: "DELETE" });
  if (result.status === 401) {
    return;
  }

  if (!result.ok) {
    chatError.textContent =
      result.status === 0
        ? "Cannot reach the server."
        : errorText(result.data, "Could not delete the chat.");
    return;
  }

  if (id === currentConversationId) {
    currentConversationId = null;
    chatTitle.textContent = "NeX AI";
    showEmpty("Select a chat or start a new one.");
  }
  await loadConversations();
}

async function loadMessages() {
  const result = await api("/conversations/" + currentConversationId + "/messages");
  if (!result.ok) {
    showEmpty("Could not load this chat.");
    return;
  }

  if (result.data.length === 0) {
    showEmpty("This chat is empty. Say hello!");
    return;
  }

  messagesBox.replaceChildren();
  for (const item of result.data) {
    addMessage(item.role, item.content);
  }
}

async function openConversation(id, title) {
  currentConversationId = id;
  chatTitle.textContent = title;
  chatError.textContent = "";
  await loadMessages();
  await loadConversations();
  chatInput.focus();
}

/* ---------- Sending messages ---------- */

function showTyping() {
  const bubble = document.createElement("div");
  bubble.id = "typing";
  bubble.className = "message assistant typing";
  bubble.textContent = "NeX AI is thinking";
  messagesBox.appendChild(bubble);
  messagesBox.scrollTop = messagesBox.scrollHeight;
}

function hideTyping() {
  const bubble = document.getElementById("typing");
  if (bubble) {
    bubble.remove();
  }
}

function setSending(state) {
  isSending = state;
  sendButton.disabled = state;
  chatInput.disabled = state;
}

function resizeInput() {
  chatInput.style.height = "auto";
  chatInput.style.height = Math.min(chatInput.scrollHeight, 160) + "px";
}

async function sendMessage() {
  const text = chatInput.value.trim();
  if (!text || isSending) {
    return;
  }

  chatError.textContent = "";
  setSending(true);

  if (currentConversationId === null) {
    const created = await api("/conversations", {
      method: "POST",
      body: JSON.stringify({ title: "New chat" }),
    });
    if (!created.ok) {
      setSending(false);
      chatError.textContent = errorText(created.data, "Could not start a new chat.");
      return;
    }
    currentConversationId = created.data.id;
    chatTitle.textContent = created.data.title;
    await loadConversations();
  }

  if (messagesBox.querySelector(".empty")) {
    messagesBox.replaceChildren();
  }
  addMessage("user", text);
  chatInput.value = "";
  resizeInput();
  showTyping();

  const result = await api("/conversations/" + currentConversationId + "/chat", {
    method: "POST",
    body: JSON.stringify({ content: text }),
  });

  hideTyping();
  setSending(false);

  if (result.status === 401) {
    return;
  }

  if (!result.ok) {
    const sent = messagesBox.querySelectorAll(".message.user");
    if (sent.length > 0) {
      sent[sent.length - 1].remove();
    }
    chatInput.value = text;
    resizeInput();
    chatError.textContent =
      result.status === 0
        ? "Cannot reach the server."
        : errorText(result.data, "Your message could not be sent.");
    chatInput.focus();
    return;
  }

  addMessage("assistant", result.data.content);
  chatInput.focus();
}

chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  sendMessage();
});

chatInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    sendMessage();
  }
});

chatInput.addEventListener("input", resizeInput);

/* ---------- Buttons and forms ---------- */

document.getElementById("show-register").addEventListener("click", (event) => {
  event.preventDefault();
  showForm("register");
});

document.getElementById("show-login").addEventListener("click", (event) => {
  event.preventDefault();
  showForm("login");
});

newChatButton.addEventListener("click", async () => {
  const result = await api("/conversations", {
    method: "POST",
    body: JSON.stringify({ title: "New chat" }),
  });
  if (!result.ok) {
    return;
  }
  await openConversation(result.data.id, result.data.title);
});

logoutButton.addEventListener("click", logout);

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  message.textContent = "Logging in...";

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;

  try {
    const response = await fetch("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await response.json();

    if (!response.ok) {
      message.textContent = errorText(data, "Login failed.");
      return;
    }

    localStorage.setItem(TOKEN_KEY, data.access_token);
    loginForm.reset();
    message.textContent = "";
    await showChat();
  } catch (error) {
    message.textContent = "Cannot reach the server.";
  }
});

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  message.textContent = "Creating account...";

  const username = document.getElementById("reg-username").value.trim();
  const email = document.getElementById("reg-email").value.trim();
  const password = document.getElementById("reg-password").value;

  try {
    const response = await fetch("/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password }),
    });
    const data = await response.json();

    if (!response.ok) {
      message.textContent = errorText(
        data,
        "Please check your details: username 3 to 50 characters, a valid email, and a password of at least 8 characters."
      );
      return;
    }

    registerForm.reset();
    showForm("login");
    message.textContent = "Account created. You can log in now.";
  } catch (error) {
    message.textContent = "Cannot reach the server.";
  }
});

/* ---------- Start ---------- */

if (getToken()) {
  showChat();
} else {
  showAuth();
}