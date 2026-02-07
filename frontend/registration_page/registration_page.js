// Form validation and functionality for NoveXa Registration Page

document.addEventListener('DOMContentLoaded', function () {
  const form = document.querySelector('.register-form');
  if (!form) return;

  // DOM references
  const firstName       = form.querySelector('#firstName');
  const lastName        = form.querySelector('#lastName');
  const email           = form.querySelector('#email');
  const phone           = form.querySelector('#phone');
  const phoneCountry    = form.querySelector('#phoneCountry'); 
  const dob             = form.querySelector('#dob');
  const role            = form.querySelector('#role');
  const password        = form.querySelector('#password');
  const confirmPassword = form.querySelector('#confirmPassword');
  const agreeEmails     = form.querySelector('#agreeEmails');
  const agreeTerms      = form.querySelector('#agreeTerms');

  const inputs = form.querySelectorAll(
    'input[type="text"], input[type="email"], input[type="tel"], input[type="password"], input[type="date"], select'
  );

  // SHOW / HIDE PASSWORD
  const togglePassword        = document.getElementById('togglePassword');
  const toggleConfirmPassword = document.getElementById('toggleConfirmPassword');

  const eyeOpenSVG =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>';

  const eyeClosedSVG =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>';

  if (togglePassword)        togglePassword.innerHTML        = eyeOpenSVG;
  if (toggleConfirmPassword) toggleConfirmPassword.innerHTML = eyeOpenSVG;

  function togglePasswordVisibility(input, iconEl) {
    if (!input || !iconEl) return;

    if (input.type === 'password') {
      input.type = 'text';
      iconEl.innerHTML = eyeClosedSVG;
    } else {
      input.type = 'password';
      iconEl.innerHTML = eyeOpenSVG;
    }
  }

  if (togglePassword) {
    togglePassword.addEventListener('click', () =>
      togglePasswordVisibility(password, togglePassword)
    );
  }

  if (toggleConfirmPassword) {
    toggleConfirmPassword.addEventListener('click', () =>
      togglePasswordVisibility(confirmPassword, toggleConfirmPassword)
    );
  }

  // phone config for different countries
  const phoneConfig = {
    dz: { label: 'Algeria', digits: 9 },
    fr: { label: 'France',  digits: 9 },
    us: { label: 'USA',     digits: 10 },
  };

  //  ERROR HELPERS 
  function showError(input, message) {
    removeError(input);

    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;

  // message under the input field
    const parent = input.closest('.input-group') || input.parentElement;

    parent.appendChild(errorDiv);
    input.classList.add('field-error');
  }

  function removeError(input) {
    const parent = input.closest('.input-group') || input.parentElement;
    if (!parent) return;
    const errorDiv = parent.querySelector('.error-message');
    if (errorDiv) errorDiv.remove();
    input.classList.remove('field-error');
  }

  //  VALIDATION FUNCTIONS 
  function validateName(input, fieldName) {
    const value = input.value.trim();

    if (!value) {
      showError(input, `${fieldName} is required`);
      return false;
    }
    if (value.length < 2) {
      showError(input, `${fieldName} must be at least 2 characters`);
      return false;
    }
    if (!/^[a-zA-Z\s'-]+$/.test(value)) {
      showError(input, `${fieldName} should only contain letters (A–Z)`);
      return false;
    }
    removeError(input);
    return true;
  }

  function validateEmail(input) {
    const value = input.value.trim();
    const emailRegex = /^([a-zA-Z0-9_\-\.]+)@([a-zA-Z0-9_\-\.]+)\.([a-zA-Z]{2,5})$/;

    if (!value) {
      showError(input, 'Email address is required');
      return false;
    }
    if (!emailRegex.test(value)) {
      showError(input, 'Please enter a valid email address');
      return false;
    }
    removeError(input);
    return true;
  }

  function validatePhone(phoneInput, countrySelect) {
    const raw = phoneInput.value.replace(/\D/g, '');
    const countryCode = countrySelect ? countrySelect.value : null;
    const cfg =
      (countryCode && phoneConfig[countryCode]) || { digits: 10, label: 'this country' };

    if (!raw) {
      showError(phoneInput, 'Phone number is required');
      return false;
    }

    if (raw.length !== cfg.digits) {
      showError(
        phoneInput,
        `Phone number must be exactly ${cfg.digits} digits for ${cfg.label}`
      );
      return false;
    }

    removeError(phoneInput);
    return true;
  }

  function validateDOB(input) {
    const value = input.value;

    if (!value) {
      showError(input, 'Date of birth is required');
      return false;
    }

    const dobDate = new Date(value);
    const today = new Date();

    if (dobDate > today) {
      showError(input, 'Date of birth cannot be in the future');
      return false;
    }

    let age = today.getFullYear() - dobDate.getFullYear();
    const monthDiff = today.getMonth() - dobDate.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < dobDate.getDate())
    ) {
      age--;
    }

    if (age < 13) {
      showError(input, 'You must be at least 13 years old to register');
      return false;
    }
    if (age > 120) {
      showError(input, 'Please enter a valid date of birth');
      return false;
    }

    removeError(input);
    return true;
  }

  function validatePassword(input) {
    const value = input.value;

    if (!value) {
      showError(input, 'Password is required');
      return false;
    }
    if (value.length < 8) {
      showError(input, 'Password must be at least 8 characters');
      return false;
    }
    if (!/[A-Z]/.test(value)) {
      showError(input, 'Password must contain at least one uppercase letter');
      return false;
    }
    if (!/[a-z]/.test(value)) {
      showError(input, 'Password must contain at least one lowercase letter');
      return false;
    }
    if (!/[0-9]/.test(value)) {
      showError(input, 'Password must contain at least one number');
      return false;
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) {
      showError(input, 'Password must contain at least one special character');
      return false;
    }

    removeError(input);
    return true;
  }

  function validateConfirmPassword(input, passwordInput) {
    const value = input.value;
    const passwordValue = passwordInput.value;

    if (!value) {
      showError(input, 'Please confirm your password');
      return false;
    }
    if (value !== passwordValue) {
      showError(input, 'Passwords do not match');
      return false;
    }

    removeError(input);
    return true;
  }

  function validateRole(input) {
    const value = input.value;
    if (!value) {
      showError(input, 'Please select your role');
      return false;
    }
    removeError(input);
    return true;
  }

  function validateTerms(checkbox) {
    if (!checkbox.checked) {
      showError(checkbox, 'You must agree to the terms and privacy policy');
      return false;
    }
    removeError(checkbox);
    return true;
  }

  //  REAL-TIME VALIDATION 
  firstName.addEventListener('blur', () =>
    validateName(firstName, 'First name')
  );
  lastName.addEventListener('blur', () =>
    validateName(lastName, 'Last name')
  );
  email.addEventListener('blur', () => validateEmail(email));
  phone.addEventListener('blur', () => validatePhone(phone, phoneCountry));
  dob.addEventListener('blur', () => validateDOB(dob));
  password.addEventListener('blur', () => validatePassword(password));
  confirmPassword.addEventListener('blur', () =>
    validateConfirmPassword(confirmPassword, password)
  );
  role.addEventListener('change', () => validateRole(role));

  // clear error on typing
  inputs.forEach((input) => {
    input.addEventListener('input', function () {
      if (this.classList.contains('field-error')) {
        removeError(this);
      }
    });
  });

  // PASSWORD STRENGTH 
  password.addEventListener('input', function () {
    const value = this.value;
    let strength = 0;

    if (value.length >= 8) strength++;
    if (/[A-Z]/.test(value)) strength++;
    if (/[a-z]/.test(value)) strength++;
    if (/[0-9]/.test(value)) strength++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(value)) strength++;

    const group = this.closest('.input-group') || this.parentElement;
    const existingIndicator = group.querySelector('.strength-indicator');
    if (existingIndicator) existingIndicator.remove();

    if (value.length > 0) {
      const strengthDiv = document.createElement('div');
      strengthDiv.className = 'strength-indicator';

      if (strength <= 2) {
        strengthDiv.textContent = 'Weak password';
        strengthDiv.style.color = '#dc3545';
      } else if (strength <= 4) {
        strengthDiv.textContent = 'Medium password';
        strengthDiv.style.color = '#ffc107';
      } else {
        strengthDiv.textContent = 'Strong password';
        strengthDiv.style.color = '#28a745';
      }

      group.appendChild(strengthDiv);
    }
  });

  // DOB YEAR LIMIT 
  dob.addEventListener('input', function (e) {
    const value = e.target.value;
    if (!value) return;

    const parts = value.split('-'); // [year, month, day]
    if (parts[0] && parts[0].length > 4) {
      parts[0] = parts[0].slice(0, 4);
      e.target.value = parts.join('-');
    }
  });

  //  PHONE INPUT – LIMIT BY COUNTRY 
  function enforcePhoneLength() {
    let raw = phone.value.replace(/\D/g, '');
    const countryCode = phoneCountry ? phoneCountry.value : null;
    const cfg =
      (countryCode && phoneConfig[countryCode]) || { digits: 10 };

    if (raw.length > cfg.digits) {
      raw = raw.slice(0, cfg.digits);
    }
    phone.value = raw;
  }

  phone.addEventListener('input', enforcePhoneLength);
  if (phoneCountry) {
    phoneCountry.addEventListener('change', function () {
      enforcePhoneLength();
      if (phone.value) validatePhone(phone, phoneCountry);
    });
  }

  //  FORM SUBMIT 
  form.addEventListener('submit', function (e) {
    e.preventDefault();

    const isFirstNameValid       = validateName(firstName, 'First name');
    const isLastNameValid        = validateName(lastName, 'Last name');
    const isEmailValid           = validateEmail(email);
    const isPhoneValid           = validatePhone(phone, phoneCountry);
    const isDOBValid             = validateDOB(dob);
    const isRoleValid            = validateRole(role);
    const isPasswordValid        = validatePassword(password);
    const isConfirmPasswordValid = validateConfirmPassword(
      confirmPassword,
      password
    );
    const isTermsValid           = validateTerms(agreeTerms);

    if (
      isFirstNameValid &&
      isLastNameValid &&
      isEmailValid &&
      isPhoneValid &&
      isDOBValid &&
      isRoleValid &&
      isPasswordValid &&
      isConfirmPasswordValid &&
      isTermsValid
    ) {
      const userData = {
        firstName: firstName.value.trim(),
        lastName: lastName.value.trim(),
        email: email.value.trim(),
        phone: phone.value.trim(),
        dateOfBirth: dob.value,
        role: role.value,
        country: phoneCountry ? phoneCountry.value : null,
        agreeToEmails: agreeEmails && agreeEmails.checked,
        agreeToTerms: agreeTerms && agreeTerms.checked,
        registrationDate: new Date().toISOString(),
      };

      // Show loading state
      const originalText = form.querySelector('.create-btn').textContent;
      form.querySelector('.create-btn').textContent = "Creating Account...";
      form.querySelector('.create-btn').disabled = true;

      const registrationData = {
        [`${role.value === 'teacher' ? 'T' : 'S'}_firstname`]: firstName.value.trim(),
        [`${role.value === 'teacher' ? 'T' : 'S'}_lastname`]: lastName.value.trim(),
        [`${role.value === 'teacher' ? 'T' : 'S'}_email`]: email.value.trim(),
        [`${role.value === 'teacher' ? 'T' : 'S'}_phone`]: phone.value.trim(),
        [`${role.value === 'teacher' ? 'T' : 'S'}_birthdate`]: dob.value,
        [`${role.value === 'teacher' ? 'T' : 'S'}_password`]: password.value
      };

      const endpoint = role.value === 'teacher' 
        ? API_CONFIG.ENDPOINTS.REGISTER_TEACHER 
        : API_CONFIG.ENDPOINTS.REGISTER_STUDENT;

      fetch(`${API_CONFIG.BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(registrationData)
      })
      .then(response => response.json().then(data => ({ status: response.status, ok: response.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) {
          throw new Error(data.message || 'Registration failed');
        }

        // Registration successful
        // Automatically log them in by saving the token
        if (data.token) {
          localStorage.setItem(API_CONFIG.KEYS.TOKEN, data.token);
          localStorage.setItem(API_CONFIG.KEYS.USER, JSON.stringify(data.user || data.teacher || data.student));
          localStorage.setItem(API_CONFIG.KEYS.ROLE, role.value);
        }

        showSuccessMessage();

        // redirect to unified home page after 2 seconds
        // The page at home_page2.html dynamically adjusts based on user role
        setTimeout(() => {
          window.location.href = '../home_page2/home_page2.html';
        }, 2000);
      })
      .catch (error => {
        console.error('Registration error:', error);
        form.querySelector('.create-btn').textContent = originalText;
        form.querySelector('.create-btn').disabled = false;
        
        if (error.message.includes('email')) {
          showError(email, error.message);
        } else {
          alert(error.message || 'An error occurred during registration. Please try again.');
        }
      });
    } else {
      const firstError = form.querySelector('.error-message');
      if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  });

  function showSuccessMessage() {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.innerHTML = `
      <div style="font-size: 3rem; margin-bottom: 1rem;">✓</div>
      <div>Registration Successful!</div>
      <div style="font-size: 0.9rem; margin-top: 0.5rem; font-weight: 400;">
        Redirecting to home page...
      </div>
    `;

    document.body.appendChild(successDiv);
  }
});





// End of Registration Script


