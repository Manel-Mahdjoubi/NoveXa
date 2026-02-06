document.addEventListener('DOMContentLoaded', () => {
    // Form validation and payment method selection
    const paymentForm = document.getElementById('payment-form');
    const completePaymentBtn = document.querySelector('.btn-complete-payment');
    
    // Load course data from localStorage
    const enrollmentCourse = JSON.parse(localStorage.getItem('enrollmentCourse'));
    
    if (!enrollmentCourse) {
        alert('No course selected for enrollment');
        window.location.href = '../home_page2/home_page2.html';
        return;
    }

    // Update Summary UI
    const summaryItems = document.querySelector('.summary-items');
    if (summaryItems) {
        summaryItems.innerHTML = `
            <div class="summary-row">
                <span class="course-name">${enrollmentCourse.title}</span>
                <span class="course-price">${enrollmentCourse.price} DA</span>
            </div>
        `;
    }

    const totalAmount = document.querySelector('.total-amount');
    const finalTotalAmount = document.querySelector('.final-total-amount');
    const discountAmount = document.querySelector('.discount-amount');
    
    if (totalAmount) totalAmount.textContent = `${enrollmentCourse.price} DA`;
    if (discountAmount) discountAmount.textContent = `0 DA`; // Reset discount for simplicity
    if (finalTotalAmount) finalTotalAmount.textContent = `${enrollmentCourse.price} DA`;

    completePaymentBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        
        if (paymentForm.checkValidity()) {
            const selectedMethod = document.querySelector('input[name="payment-method"]:checked');
            if (!selectedMethod) {
                alert('Please select a payment method');
                return;
            }

            // UI Feedback
            completePaymentBtn.disabled = true;
            completePaymentBtn.textContent = 'Processing Payment...';

            try {
                const response = await apiCall(API_CONFIG.ENDPOINTS.ENROLL, {
                    method: 'POST',
                    body: JSON.stringify({ courseId: enrollmentCourse.courseId })
                });

                if (response.success) {
                    console.log('Enrollment successful:', response);
                    // Redirect to Course player
                    window.location.href = `../CourseAfterApply/courseafterapply.html?courseId=${enrollmentCourse.courseId}`;
                } else {
                    throw new Error(response.message || 'Enrollment failed');
                }
            } catch (error) {
                console.error('Payment/Enrollment error:', error);
                alert('Failed to process enrollment: ' + error.message);
                completePaymentBtn.disabled = false;
                completePaymentBtn.textContent = 'Complete Payment';
            }
        } else {
            paymentForm.reportValidity();
        }
    });

    // Format card number with spaces and strict 16-digit limit
    const cardNumberInput = document.getElementById('card-number');
    if (cardNumberInput) {
        cardNumberInput.addEventListener('input', (e) => {
            // Remove everything except digits
            let value = e.target.value.replace(/\D/g, '');
            
            // Limit to 16 digits
            if (value.length > 16) {
                value = value.slice(0, 16);
            }
            
            // Format with spaces every 4 digits
            const formattedValue = value.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
            e.target.value = formattedValue;
        });
        
        // Prevent typing non-digits
        cardNumberInput.addEventListener('keydown', (e) => {
            const allowedKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'];
            if (!/^\d$/.test(e.key) && !allowedKeys.includes(e.key)) {
                e.preventDefault();
            }
        });
    }

    // Add card number length validation to submit handler
    const originalSubmitHandler = completePaymentBtn.onclick;
    completePaymentBtn.addEventListener('click', (e) => {
        const value = cardNumberInput.value.replace(/\s/g, '');
        if (value.length !== 16) {
            e.preventDefault();
            e.stopPropagation();
            alert('Please enter a valid 16-digit card number.');
            cardNumberInput.focus();
            return false;
        }
    }, true); // Use capture to validate before the main logic

    // Format expiry date
    const expiryInput = document.getElementById('expiry');
    if (expiryInput) {
        expiryInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length >= 2) {
                value = value.slice(0, 2) + '/' + value.slice(2, 4);
            }
            e.target.value = value;
        });
    }

    // CVV input - numbers only
    const cvvInput = document.getElementById('cvv');
    if (cvvInput) {
        cvvInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, '').slice(0, 3);
        });
    }
});
