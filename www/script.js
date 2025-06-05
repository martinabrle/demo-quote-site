const quotes = [
    "The only way to do great work is to love what you do. – Steve Jobs",
    "Success is not the key to happiness. Happiness is the key to success.",
    "Believe you can and you're halfway there. – Theodore Roosevelt",
    "You miss 100% of the shots you don’t take. – Wayne Gretzky",
    "The best time to plant a tree was 20 years ago. The second best time is now."
];

// MSAL configuration (replace with your Azure AD App details after registration)
const msalConfig = {
    auth: {
        clientId: "<YOUR_CLIENT_ID>", // Replace with your Application (client) ID
        authority: "https://login.microsoftonline.com/common", // Or your tenant ID
        redirectUri: window.location.origin
    }
};

const msalInstance = new msal.PublicClientApplication(msalConfig);

// UI elements for login/logout
const authContainer = document.getElementById('auth-container');
authContainer.classList.add('auth-container');

const loginButton = document.createElement('button');
loginButton.textContent = 'Sign in with Microsoft';
const logoutButton = document.createElement('button');
logoutButton.textContent = 'Sign out';

authContainer.appendChild(loginButton);

function updateAuthUI(account) {
    if (account) {
        loginButton.style.display = 'none';
        logoutButton.style.display = 'inline-block';
        if (!authContainer.contains(logoutButton)) authContainer.appendChild(logoutButton);
    } else {
        loginButton.style.display = 'inline-block';
        logoutButton.style.display = 'none';
        if (authContainer.contains(logoutButton)) authContainer.removeChild(logoutButton);
    }
}

loginButton.onclick = async () => {
    try {
        const loginResponse = await msalInstance.loginPopup({ scopes: ["openid", "profile", "User.Read"] });
        updateAuthUI(loginResponse.account);
        alert(`Signed in as: ${loginResponse.account.username}`);
    } catch (err) {
        alert('Login failed: ' + err.message);
    }
};

logoutButton.onclick = async () => {
    const account = msalInstance.getAllAccounts()[0];
    if (account) {
        await msalInstance.logoutPopup({ account });
        updateAuthUI(null);
    }
};

// On load, check if user is signed in
window.onload = function() {
    const quoteElement = document.getElementById('quote');
    const randomIndex = Math.floor(Math.random() * quotes.length);
    quoteElement.textContent = quotes[randomIndex];

    const account = msalInstance.getAllAccounts()[0];
    updateAuthUI(account);
};
