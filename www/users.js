// MSAL configuration (should match main script.js)
const msalConfig = {
    auth: {
        clientId: "<YOUR_CLIENT_ID>", // Replace with your Application (client) ID
        authority: "https://login.microsoftonline.com/common", // Or your tenant ID
        redirectUri: window.location.origin
    }
};

const msalInstance = new msal.PublicClientApplication(msalConfig);

// Microsoft Graph API endpoints
const GRAPH_API_BASE = 'https://graph.microsoft.com/v1.0';
const GRAPH_USERS_ENDPOINT = `${GRAPH_API_BASE}/users`;
const GRAPH_INVITATIONS_ENDPOINT = `${GRAPH_API_BASE}/invitations`;

let currentUser = null;
let accessToken = null;

// UI elements
const authContainer = document.getElementById('auth-container');
const authCheck = document.getElementById('auth-check');
const userManagementPanel = document.getElementById('user-management-panel');
const usersListContainer = document.getElementById('users-list');
const refreshUsersBtn = document.getElementById('refresh-users-btn');
const inviteUserBtn = document.getElementById('invite-user-btn');
const inviteEmailInput = document.getElementById('invite-email');
const userRoleSelect = document.getElementById('user-role');

// Create auth buttons
const loginButton = document.createElement('button');
loginButton.textContent = 'Sign in with Microsoft';
loginButton.className = 'action-btn primary';

const logoutButton = document.createElement('button');
logoutButton.textContent = 'Sign out';
logoutButton.className = 'action-btn';

authContainer.appendChild(loginButton);

// Authentication functions
async function signIn() {
    try {
        const loginResponse = await msalInstance.loginPopup({
            scopes: [
                "openid", 
                "profile", 
                "User.Read", 
                "User.ReadWrite.All",
                "Directory.Read.All",
                "Directory.ReadWrite.All"
            ]
        });
        
        currentUser = loginResponse.account;
        await getAccessToken();
        await checkAdminAccess();
        updateAuthUI();
        
    } catch (error) {
        console.error('Login failed:', error);
        showError('Login failed: ' + error.message);
    }
}

async function signOut() {
    try {
        await msalInstance.logoutPopup({ account: currentUser });
        currentUser = null;
        accessToken = null;
        updateAuthUI();
    } catch (error) {
        console.error('Logout failed:', error);
    }
}

async function getAccessToken() {
    try {
        const tokenRequest = {
            scopes: [
                "User.ReadWrite.All",
                "Directory.Read.All",
                "Directory.ReadWrite.All"
            ],
            account: currentUser
        };
        
        const response = await msalInstance.acquireTokenSilent(tokenRequest);
        accessToken = response.accessToken;
        return accessToken;
    } catch (error) {
        console.error('Token acquisition failed:', error);
        throw error;
    }
}

// Check if current user has admin privileges
async function checkAdminAccess() {
    try {
        if (!accessToken) {
            await getAccessToken();
        }
        
        const response = await fetch(`${GRAPH_API_BASE}/me`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        
        if (response.ok) {
            const userData = await response.json();
            
            // Check if user is admin (simplified check for demo)
            const isAdmin = userData.jobTitle?.toLowerCase().includes('admin') || 
                           userData.mail?.includes('admin') ||
                           localStorage.getItem('userRole') === 'admin' ||
                           userData.userPrincipalName?.includes('admin');
            
            if (isAdmin) {
                showUserManagement();
                await loadUsers();
            } else {
                showError('Access denied. Admin privileges required.');
            }
            
            return isAdmin;
        } else {
            throw new Error('Failed to verify user privileges');
        }
    } catch (error) {
        console.error('Admin check failed:', error);
        showError('Failed to verify admin access: ' + error.message);
        return false;
    }
}

// UI Management functions
function updateAuthUI() {
    if (currentUser) {
        loginButton.style.display = 'none';
        logoutButton.style.display = 'inline-block';
        if (!authContainer.contains(logoutButton)) {
            authContainer.appendChild(logoutButton);
        }
        authCheck.style.display = 'none';
    } else {
        loginButton.style.display = 'inline-block';
        logoutButton.style.display = 'none';
        if (authContainer.contains(logoutButton)) {
            authContainer.removeChild(logoutButton);
        }
        authCheck.style.display = 'block';
        userManagementPanel.style.display = 'none';
    }
}

function showUserManagement() {
    authCheck.style.display = 'none';
    userManagementPanel.style.display = 'block';
}

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
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.remove();
        }
    }, 5000);
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
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
        if (successDiv.parentNode) {
            successDiv.remove();
        }
    }, 3000);
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

// Event listeners
loginButton.onclick = signIn;
logoutButton.onclick = signOut;
refreshUsersBtn.onclick = loadUsers;
inviteUserBtn.onclick = inviteUser;

// Handle Enter key in invite email input
inviteEmailInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        inviteUser();
    }
});

// Initialize on page load
window.onload = function() {
    const account = msalInstance.getAllAccounts()[0];
    if (account) {
        currentUser = account;
        getAccessToken().then(() => {
            checkAdminAccess();
            updateAuthUI();
        }).catch(error => {
            console.error('Token acquisition failed on load:', error);
            updateAuthUI();
        });
    } else {
        updateAuthUI();
    }
};

// For demo purposes - allow setting admin role
window.setAdminRole = function() {
    localStorage.setItem('userRole', 'admin');
    if (currentUser) {
        checkAdminAccess();
    }
    console.log('Admin role set for demo purposes. Refresh or re-login to see changes.');
};
