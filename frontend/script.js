const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const message = document.getElementById("message");

function showForm(name) {
  loginForm.classList.toggle("hidden", name !== "login");
  registerForm.classList.toggle("hidden", name !== "register");
  message.textContent = "";
}

document.getElementById("show-register").addEventListener("click", (event) => {
  event.preventDefault();
  showForm("register");
});

document.getElementById("show-login").addEventListener("click", (event) => {
  event.preventDefault();
  showForm("login");
});

function errorText(data, fallback) {
  return typeof data.detail === "string" ? data.detail : fallback;
}

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