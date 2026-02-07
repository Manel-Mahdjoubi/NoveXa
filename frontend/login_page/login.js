
document.addEventListener("DOMContentLoaded", () => {
  const loginForm       = document.querySelector("form");
  const identifierInput = document.getElementById("identifier");
  const passwordInput   = document.getElementById("password");
  const toggle          = document.getElementById("password-toggle");
  const loginButton     = document.querySelector(".login-button");

  /* PASSWORD VISIBILITY TOGGLE  */

  const eyeOpenSVG =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>';

  const eyeClosedSVG =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>';

  if (passwordInput && toggle) {
    // initial icon
    toggle.innerHTML = eyeOpenSVG;
    toggle.setAttribute("aria-label", "Show password");
    toggle.setAttribute("aria-pressed", "false");

    const toggleVisibility = () => {
      const isPwd = passwordInput.type === "password";
      passwordInput.type = isPwd ? "text" : "password";
      toggle.innerHTML = isPwd ? eyeClosedSVG : eyeOpenSVG;
      toggle.setAttribute("aria-label", isPwd ? "Hide password" : "Show password");
      toggle.setAttribute("aria-pressed", String(isPwd));
    };

    toggle.addEventListener("click", toggleVisibility);

    toggle.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggleVisibility();
      }
    });
  }

  /*  VALIDATION HELPERS  */

  function clearErrors() {
    if (!loginForm) return;
    const oldErrors = loginForm.querySelectorAll(".field-error");
    oldErrors.forEach((err) => err.remove());

    const erroredInputs = loginForm.querySelectorAll(".has-error");
    erroredInputs.forEach((input) => {
      input.classList.remove("has-error");
      input.style.borderColor = "";
    });
  }

  function showError(input, message) {
    if (!input) return;

    const group = input.closest(".form-group") || input.parentElement;
    if (!group) return;

    input.classList.add("has-error");
    input.style.borderColor = "#c0392b";

    const errorEl = document.createElement("p");
    errorEl.className = "field-error";
    errorEl.textContent = message;
    errorEl.style.color = "#c0392b";
    errorEl.style.fontSize = "0.85rem";
    errorEl.style.margin = "4px 0 0";
    errorEl.setAttribute("role", "alert");

    group.appendChild(errorEl);
  }

  function validateForm() {
    if (!loginForm) return false;

    clearErrors();
    let isValid = true;

    const identifierValue = (identifierInput?.value || "").trim();
    const passwordValue   = (passwordInput?.value   || "").trim();

    // identifier (email / username)
    if (!identifierValue) {
      showError(identifierInput, "Please enter your email or username.");
      isValid = false;
    } else {
      const looksLikeEmail = identifierValue.includes("@");
      if (!looksLikeEmail && identifierValue.length < 3) {
        showError(
          identifierInput,
          "Username should be at least 3 characters, or use a valid email."
        );
        isValid = false;
      }
    }

    // password
    if (!passwordValue) {
      showError(passwordInput, "Please enter your password.");
      isValid = false;
    } else if (passwordValue.length < 6) {
      showError(passwordInput, "Password must be at least 6 characters.");
      isValid = false;
    }

    return isValid;
  }

  /* LOGIN BUTTON  */

  if (loginForm && loginButton) {
    loginButton.addEventListener("click", async (e) => {
      e.preventDefault();
      const ok = validateForm();
      if (!ok) return;

      const identifierValue = (identifierInput?.value || "").trim();
      const passwordValue = (passwordInput?.value || "").trim();

      // Show loading state
      const originalText = loginButton.textContent;
      loginButton.textContent = "Logging in...";
      loginButton.disabled = true;

      try {
        const response = await fetch(`${API_CONFIG.BASE_URL}/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: identifierValue,
            password: passwordValue
          })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Login failed');
        }

        // Login successful
        // Save token and user info
        localStorage.setItem(API_CONFIG.KEYS.TOKEN, data.token);
        if (data.user) {
          localStorage.setItem(API_CONFIG.KEYS.USER, JSON.stringify(data.user));
          localStorage.setItem(API_CONFIG.KEYS.ROLE, data.user.role || 'student');
          // Also save specific ID for convenience if needed
          if (data.user.role === 'teacher') {
            localStorage.setItem('teacherId', data.user.id);
          } else {
            localStorage.setItem('studentId', data.user.id);
          }
        }

        // Redirect to unified home page
        // The page at home_page2.html dynamically adjusts based on user role
        window.location.href = "../home_page2/home_page2.html";

      } catch (error) {
        console.error('Login error:', error);
        showError(passwordInput, error.message || "Invalid credentials. Please try again.");
      } finally {
        // Reset button state
        loginButton.textContent = originalText;
        loginButton.disabled = false;
      }
    });
  }

  /*  SOCIAL LOGIN PLACEHOLDER  */

  const socialButtons = document.querySelectorAll(".social-button");

  socialButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const provider =
        btn.dataset.provider ||
        btn.getAttribute("aria-label") ||
        "Social";

      alert(
        `${provider} login is not available yet.\n` +
          `Once the backend is connected, this button will start the real ${provider} login flow.`
      );
    });
  });
});

