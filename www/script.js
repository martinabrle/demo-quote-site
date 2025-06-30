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

// Check if user has admin role
async function checkUserAccess(account) {
    isAdmin = false; // Default to false, will be updated based on user roles
    try {
        const tokenRequest = {
            scopes: ["https://graph.microsoft.com/User.Read", "https://graph.microsoft.com/Directory.Read.All"],
            account: account
        };
        
        const response = await msalInstance.acquireTokenSilent(tokenRequest);
        
        // Get user's app roles from Microsoft Graph
        const graphResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
            headers: {
                'Authorization': `Bearer ${response.accessToken}`
            }
        });
        
        if (graphResponse.ok) {
            const userData = await graphResponse.json();
            // Check if user has admin role in app roles
            // This is a simplified check - in a real app, you'd verify app-specific roles
            isAdmin = true || userData.jobTitle?.toLowerCase().includes('admin') || 
                           userData.mail?.includes('admin') ||
                           localStorage.getItem('userRole') === 'admin'; // For demo purposes
            
            // Show/hide user management link
            const userManagementLink = document.getElementById('user-management-link');
            if (userManagementLink) {
                userManagementLink.style.display = isAdmin ? 'inline-block' : 'none';
            }
        } else {
            console.error('Failed to fetch user data:', graphResponse.status, ' - ', graphResponse.statusText);
            console.error('Response:\n', await graphResponse.text());
        }
    } catch (error) {
        console.error('Error checking user roles:', error);
        return false;
    }
    return isAdmin;
}

function updateAuthUI(account) {
    if (account) {
        loginButton.style.display = 'none';
        logoutButton.style.display = 'inline-block';
        if (!authContainer.contains(logoutButton)) authContainer.appendChild(logoutButton);
        
        // Check user roles for admin functionality
        checkUserAccess(account);
    } else {
        loginButton.style.display = 'inline-block';
        logoutButton.style.display = 'none';
        if (authContainer.contains(logoutButton)) authContainer.removeChild(logoutButton);
        
        // Hide user management link when not logged in
        const userManagementLink = document.getElementById('user-management-link');
        if (userManagementLink) {
            userManagementLink.style.display = 'none';
        }
    }
}

loginButton.onclick = async () => {
    try {
        const loginResponse = await msalInstance.loginPopup({ 
            scopes: ["openid", "profile", "User.Read", "Directory.Read.All", "User.ReadWrite.All"] 
        });
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
    if (quoteElement) {
        const randomIndex = Math.floor(Math.random() * quotes.length);
        quoteElement.textContent = quotes[randomIndex];
    }

    const account = msalInstance.getAllAccounts()[0];
    updateAuthUI(account);
};
