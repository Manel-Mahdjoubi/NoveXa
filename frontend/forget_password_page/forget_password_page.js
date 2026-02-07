const form = document.getElementById('forgotPasswordForm');
const emailInput = document.getElementById('email');
const successMessage = document.getElementById('successMessage');
const errorMessage = document.getElementById('errorMessage');

if (form && emailInput && successMessage && errorMessage) {
  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    // hide old messages
    successMessage.style.display = 'none';
    errorMessage.style.display = 'none';

    const email = emailInput.value.trim();

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      errorMessage.textContent = 'Please enter a valid email address.';
      errorMessage.style.display = 'block';
      return;
    }

    try {
      const response = await fetch(
        `${API_CONFIG.BASE_URL}/auth/forgot-password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email })
        }
      );

      const data = await response.json();

      if (data.success) {
        successMessage.style.display = 'block';
        emailInput.value = '';

        // optional redirect
        // setTimeout(() => {
        //   window.location.href =
        //     '../reset_pasword_page/reset_password_page.html';
        // }, 2000);
      } else {
        errorMessage.textContent =
          data.message || 'Something went wrong. Please try again.';
        errorMessage.style.display = 'block';
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      errorMessage.textContent = error.message || 'Server error. Please try again later.';
      errorMessage.style.display = 'block';
    }
  });

  // Clear error message when user starts typing
  emailInput.addEventListener('input', function () {
    errorMessage.style.display = 'none';
  });
}