const container = document.getElementById('container');
const registerBtn = document.getElementById('register');
const loginBtn = document.getElementById('login');
const spinner = document.getElementById('spinner'); // Spinner element

// Toggle between sign-in and sign-up forms
registerBtn.addEventListener('click', () => {
    container.classList.add("active");
});

loginBtn.addEventListener('click', () => {
    container.classList.remove("active");
});

// Handle sign-in process
document.getElementById('signin-form').addEventListener('submit', async function (event) {
    event.preventDefault(); // Prevent form from reloading the page

    // Show the spinner
    spinner.style.display = 'block';

    // Get the email and password values from the form
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        // Send a POST request to the sign-in API
        const response = await fetch('https://group-api-b4pm.onrender.com/api/users/signin', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: email,
                password: password
            })
        });

        const data = await response.json();

        console.log("Login response:", data); // Check if 'avatar' is included in the response



        // Hide the spinner after getting the response
        spinner.style.display = 'none';

        if (response.ok) {
            // Success: handle what to do on a successful sign-in
            console.log("Login successful:", data);
            // alert("Login successful!");

            // Store the returned token and user data in sessionStorage
            sessionStorage.setItem("token", data.token);
            sessionStorage.setItem("uuid", data.user.uuid);
            sessionStorage.setItem("name", data.user.name);
            sessionStorage.setItem("avatar", data.user.avatar);
            console.log("Avatar saved in sessionStorage:", data.user.avatar);

            // Redirect to map_testing.html in the parent directory
            window.location.href = "../map_testing.html";

        } else {
            // Error: handle the error case
            console.error("Login failed:", data.message);
            alert("Login failed: " + data.message);
        }
    } catch (error) {
        // Hide the spinner if an error occurs
        spinner.style.display = 'none';

        // Handle network or other errors
        console.error("An error occurred:", error);
        alert("An error occurred. Please try again.");
    }
});


