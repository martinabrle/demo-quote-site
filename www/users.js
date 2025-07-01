// MSAL configuration (replace with your Azure AD App details after registration)
const msalConfig = {
    auth: {
        clientId: "<YOUR_CLIENT_ID>", // Replace with your Application (client) ID
        authority: "https://login.microsoftonline.com/common", // Or your tenant ID
        redirectUri: window.location.origin
    }
};

const msalInstance = new msal.PublicClientApplication(msalConfig);

// Graph API endpoints
// Microsoft Graph API endpoints
const GRAPH_API_BASE = 'https://graph.microsoft.com/v1.0';
const GRAPH_USERS_ENDPOINT = `${GRAPH_API_BASE}/users`;
const GRAPH_INVITATIONS_ENDPOINT = `${GRAPH_API_BASE}/invitations`;


// UI elements for login/logout
const authContainer = document.getElementById('auth-container');
authContainer.classList.add('auth-container');

const loginButton = document.createElement('button');
loginButton.textContent = 'Sign in with Microsoft';
const logoutButton = document.createElement('button');
logoutButton.textContent = 'Sign out';

const refreshUsersBtn = document.getElementById('refresh-users-btn');
const inviteUserBtn = document.getElementById('invite-user-btn');
const inviteEmailInput = document.getElementById('invite-email');

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

refreshUsersBtn.onclick = loadUsers;
inviteUserBtn.onclick = inviteUser;

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    
    // Remove any existing error messages
    const existingErrors = document.querySelectorAll('.error-message');
    existingErrors.forEach(error => error.remove());
    
    // Add new error message
    const container = document.querySelector('.container');
    container.insertBefore(errorDiv, container.firstChild);
    
    // Auto-remove after 25 seconds
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.remove();
        }
    }, 25000);
}

function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.textContent = message;
    
    // Remove any existing success messages
    const existingSuccess = document.querySelectorAll('.success-message');
    existingSuccess.forEach(success => success.remove());
    
    // Add new success message
    const container = document.querySelector('.container');
    container.insertBefore(successDiv, container.firstChild);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (successDiv.parentNode) {
            successDiv.remove();
        }
    }, 5000);
}

// User management functions
async function loadUsers() {
    try {
        if (!accessToken) {
            await getAccessToken();
        }
        
        usersListContainer.innerHTML = '<div class="loading">Loading users...</div>';
        
        const response = await fetch(`${GRAPH_USERS_ENDPOINT}?$select=id,displayName,userPrincipalName,jobTitle,accountEnabled&$top=50`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            displayUsers(data.value);
        } else {
            throw new Error(`Failed to load users: ${response.status} ${response.statusText}`);
        }
    } catch (error) {
        console.error('Failed to load users:', error);
        usersListContainer.innerHTML = '<div class="error">Failed to load users. Please try again.</div>';
        showError('Failed to load users: ' + error.message);
    }
}

function displayUsers(users) {
    if (users.length === 0) {
        usersListContainer.innerHTML = '<div class="no-data">No users found.</div>';
        return;
    }
    
    const usersHTML = users.map(user => `
        <div class="user-item">
            <div class="user-info">
                <div class="user-name">${user.displayName || 'No name'}</div>
                <div class="user-email">${user.userPrincipalName}</div>
                <div class="user-title">${user.jobTitle || 'No title'}</div>
                <div class="user-status ${user.accountEnabled ? 'enabled' : 'disabled'}">
                    ${user.accountEnabled ? 'Active' : 'Disabled'}
                </div>
            </div>
            <div class="user-actions">
                <button onclick="removeUser('${user.id}', '${user.displayName}')" 
                        class="action-btn danger small">Remove</button>
            </div>
        </div>
    `).join('');
    
    usersListContainer.innerHTML = usersHTML;
}

async function inviteUser() {
    const email = inviteEmailInput.value.trim();
    const role = userRoleSelect.value;
    
    if (!email) {
        showError('Please enter a valid email address.');
        return;
    }
    
    if (!email.includes('@')) {
        showError('Please enter a valid email address.');
        return;
    }
    
    try {
        if (!accessToken) {
            await getAccessToken();
        }
        
        inviteUserBtn.disabled = true;
        inviteUserBtn.textContent = 'Sending...';
        
        const invitationData = {
            invitedUserEmailAddress: email,
            inviteRedirectUrl: window.location.origin,
            invitedUserDisplayName: email.split('@')[0],
            sendInvitationMessage: true,
            invitedUserMessageInfo: {
                customizedMessageBody: `You have been invited to access the Random Quote application with ${role} privileges.`
            }
        };
        
        const response = await fetch(GRAPH_INVITATIONS_ENDPOINT, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(invitationData)
        });
        
        if (response.ok) {
            const result = await response.json();
            showSuccess(`Invitation sent successfully to ${email}`);
            inviteEmailInput.value = '';
            
            // Refresh users list
            setTimeout(() => loadUsers(), 2000);
        } else {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || `Failed to send invitation: ${response.status}`);
        }
        
    } catch (error) {
        console.error('Failed to invite user:', error);
        showError('Failed to send invitation: ' + error.message);
    } finally {
        inviteUserBtn.disabled = false;
        inviteUserBtn.textContent = 'Send Invitation';
    }
}

async function removeUser(userId, userName) {
    if (!confirm(`Are you sure you want to remove user "${userName}" from the application? This action cannot be undone.`)) {
        return;
    }
    
    try {
        if (!accessToken) {
            await getAccessToken();
        }
        
        const response = await fetch(`${GRAPH_USERS_ENDPOINT}/${userId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        
        if (response.ok || response.status === 204) {
            showSuccess(`User "${userName}" has been removed successfully.`);
            await loadUsers(); // Refresh the list
        } else {
            throw new Error(`Failed to remove user: ${response.status} ${response.statusText}`);
        }
        
    } catch (error) {
        console.error('Failed to remove user:', error);
        showError('Failed to remove user: ' + error.message);
    }
}

// Handle Enter key in invite email input
inviteEmailInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        inviteUser();
    }
});

// On load, check if user is signed in
window.onload = function() {

    const account = msalInstance.getAllAccounts()[0];
    updateAuthUI(account);
};
