// Reset Password page behavior: toggles, strength meter, validation, backend integration
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('resetPasswordForm');
  const newPasswordInput = document.getElementById('newPassword');
  const confirmPasswordInput = document.getElementById('confirmPassword');
  const toggleNewPassword = document.getElementById('toggleNewPassword');
  const toggleConfirmPassword = document.getElementById('toggleConfirmPassword');
  const successMessage = document.getElementById('successMessage');
  const errorMessage = document.getElementById('errorMessage');
  const passwordStrength = document.getElementById('passwordStrength');
  const strengthBar = document.getElementById('strengthBar');
  const strengthText = document.getElementById('strengthText');

  if (!form || !newPasswordInput || !confirmPasswordInput) return;

  // SVG icons
  const eyeOpenSVG =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
  const eyeClosedSVG =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>';

  if (toggleNewPassword) toggleNewPassword.innerHTML = eyeOpenSVG;
  if (toggleConfirmPassword) toggleConfirmPassword.innerHTML = eyeOpenSVG;

  function togglePasswordVisibility(input, iconEl) {
    if (input.type === 'password') {
      input.type = 'text';
      iconEl.innerHTML = eyeClosedSVG;
    } else {
      input.type = 'password';
      iconEl.innerHTML = eyeOpenSVG;
    }
  }

  toggleNewPassword?.addEventListener('click', () =>
    togglePasswordVisibility(newPasswordInput, toggleNewPassword)
  );
  toggleConfirmPassword?.addEventListener('click', () =>
    togglePasswordVisibility(confirmPasswordInput, toggleConfirmPassword)
  );

  function checkPasswordRequirements(password) {
    const requirements = {
      length: password.length >= 8,
      upper: /[A-Z]/.test(password),
      lower: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };

    document.getElementById('reqLength')?.classList.toggle('met', requirements.length);
    document.getElementById('reqUpper')?.classList.toggle('met', requirements.upper);
    document.getElementById('reqLower')?.classList.toggle('met', requirements.lower);
    document.getElementById('reqNumber')?.classList.toggle('met', requirements.number);
    document.getElementById('reqSpecial')?.classList.toggle('met', requirements.special);

    return Object.values(requirements).every(Boolean);
  }

  function calculatePasswordStrength(password) {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++;

    strengthBar.className = 'password-strength-bar';

    if (strength <= 2) {
      strengthBar.classList.add('strength-weak');
      strengthText.textContent = 'Weak password';
      strengthText.style.color = '#dc3545';
    } else if (strength <= 4) {
      strengthBar.classList.add('strength-medium');
      strengthText.textContent = 'Medium password';
      strengthText.style.color = '#ffc107';
    } else {
      strengthBar.classList.add('strength-strong');
      strengthText.textContent = 'Strong password';
      strengthText.style.color = '#28a745';
    }
  }

  newPasswordInput.addEventListener('input', () => {
    const password = newPasswordInput.value;

    if (password.length > 0) {
      passwordStrength.style.display = 'block';
      strengthText.style.display = 'block';
    } else {
      passwordStrength.style.display = 'none';
      strengthText.style.display = 'none';
    }

    checkPasswordRequirements(password);
    calculatePasswordStrength(password);
    errorMessage.style.display = 'none';
  });

  confirmPasswordInput.addEventListener('input', () => {
    errorMessage.style.display = 'none';
  });

  // SUBMIT — BACKEND INTEGRATION
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    errorMessage.style.display = 'none';
    successMessage.style.display = 'none';

    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    if (!checkPasswordRequirements(newPassword)) {
      errorMessage.textContent = 'Password does not meet all requirements.';
      errorMessage.style.display = 'block';
      return;
    }

    if (newPassword !== confirmPassword) {
      errorMessage.textContent = 'Passwords do not match.';
      errorMessage.style.display = 'block';
      return;
    }

    // GET TOKEN FROM URL
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (!token) {
      errorMessage.textContent = 'Invalid or missing reset token.';
      errorMessage.style.display = 'block';
      return;
    }

    try {
      const res = await fetch(
        `${API_CONFIG.BASE_URL}/auth/reset-password/${token}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: newPassword })
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Reset failed');
      }

      // SUCCESS
      form.style.display = 'none';
      successMessage.style.display = 'block';

      setTimeout(() => {
        window.location.href = '../login_page/login.html';
      }, 2200);

    } catch (err) {
      errorMessage.textContent = err.message;
      errorMessage.style.display = 'block';
    }
  });
});
