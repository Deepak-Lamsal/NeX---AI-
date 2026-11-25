const form = document.getElementById("login-form");
const message = document.getElementById("message");

form.addEventListener("submit", async (event) => {
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
      message.textContent =
        typeof data.detail === "string" ? data.detail : "Login failed.";
      return;
    }

    localStorage.setItem("nex_token", data.access_token);

    const meResponse = await fetch("/auth/me", {
      headers: { Authorization: "Bearer " + data.access_token },
    });
    const me = await meResponse.json();
    message.textContent = "Logged in as " + me.username;
  } catch (error) {
    message.textContent = "Cannot reach the server.";
  }
});