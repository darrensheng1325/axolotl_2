interface StoredCredentials {
    username: string;
    password: string;
}

export class AuthUI {
    private authContainer: HTMLElement;
    private loginForm: HTMLElement;
    private registerForm: HTMLElement;
    private loginButton: HTMLElement;
    private registerButton: HTMLElement;
    private showRegisterLink: HTMLElement;
    private showLoginLink: HTMLElement;
    private serverUrl: string;

    // Login form elements
    private loginUsername: HTMLInputElement;
    private loginPassword: HTMLInputElement;

    // Register form elements
    private registerUsername: HTMLInputElement;
    private registerPassword: HTMLInputElement;
    private registerConfirmPassword: HTMLInputElement;
    private serverIPInput: HTMLInputElement;

    constructor() {
        // Get DOM elements
        this.authContainer = document.getElementById('authContainer')!;
        this.loginForm = document.getElementById('loginForm')!;
        this.registerForm = document.getElementById('registerForm')!;
        
        // Login elements
        this.loginButton = document.getElementById('loginButton')!;
        this.loginUsername = document.getElementById('loginUsername') as HTMLInputElement;
        this.loginPassword = document.getElementById('loginPassword') as HTMLInputElement;
        
        // Register elements
        this.registerButton = document.getElementById('registerButton')!;
        this.registerUsername = document.getElementById('registerUsername') as HTMLInputElement;
        this.registerPassword = document.getElementById('registerPassword') as HTMLInputElement;
        this.registerConfirmPassword = document.getElementById('registerConfirmPassword') as HTMLInputElement;
        this.serverIPInput = document.getElementById('serverIP') as HTMLInputElement;
        
        // Set default server URL
        this.serverIPInput.value = 'https://localhost:3000';
        this.serverUrl = this.serverIPInput.value;
        
        // Form switch elements
        this.showRegisterLink = document.getElementById('showRegister')!;
        this.showLoginLink = document.getElementById('showLogin')!;

        // Bind event listeners
        this.loginButton.addEventListener('click', () => this.handleLogin());
        this.registerButton.addEventListener('click', () => this.handleRegister());
        this.showRegisterLink.addEventListener('click', () => this.toggleForms());
        this.showLoginLink.addEventListener('click', () => this.toggleForms());

        // Add server IP change listener
        this.serverIPInput.addEventListener('change', () => {
            this.serverUrl = this.serverIPInput.value;
            // Store the server URL for future use
            localStorage.setItem('serverUrl', this.serverUrl);
        });

        // Load saved server URL if exists
        const savedServerUrl = localStorage.getItem('serverUrl');
        if (savedServerUrl) {
            this.serverUrl = savedServerUrl;
            this.serverIPInput.value = savedServerUrl;
        }

        // Check for stored credentials
        this.checkStoredCredentials();
    }

    private toggleForms() {
        this.loginForm.classList.toggle('hidden');
        this.registerForm.classList.toggle('hidden');
        
        // Update server URL when switching to login
        if (!this.loginForm.classList.contains('hidden')) {
            this.serverUrl = this.serverIPInput.value;
        }
    }

    private async handleLogin() {
        const username = this.loginUsername.value;
        const password = this.loginPassword.value;
        
        // Use the server URL from the input field even during login
        const serverUrl = this.serverIPInput.value || this.serverUrl;

        try {
            // Try server authentication first
            const response = await fetch(`${serverUrl}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
                credentials: 'include'
            });

            if (response.ok) {
                // Store credentials and server URL locally
                localStorage.setItem('username', username);
                localStorage.setItem('password', password);
                localStorage.setItem('currentUser', username);
                localStorage.setItem('serverUrl', serverUrl);
                this.hideAuthForm();
            } else {
                // Fallback to local authentication
                const storedCredentials = this.getStoredCredentials();
                const userExists = storedCredentials.find(cred => 
                    cred.username === username && cred.password === password
                );

                if (userExists) {
                    localStorage.setItem('currentUser', username);
                    this.hideAuthForm();
                } else {
                    alert('Invalid username or password');
                }
            }
        } catch (error) {
            console.error('Login error:', error);
            // Fallback to local authentication on server error
            const storedCredentials = this.getStoredCredentials();
            const userExists = storedCredentials.find(cred => 
                cred.username === username && cred.password === password
            );

            if (userExists) {
                localStorage.setItem('currentUser', username);
                this.hideAuthForm();
            } else {
                alert('Invalid username or password');
            }
        }
    }

    private async handleRegister() {
        const username = this.registerUsername.value;
        const password = this.registerPassword.value;
        const confirmPassword = this.registerConfirmPassword.value;
        const serverUrl = this.serverIPInput.value;

        if (!serverUrl) {
            alert('Please enter a server IP address');
            return;
        }

        if (password !== confirmPassword) {
            alert('Passwords do not match');
            return;
        }

        try {
            // Try server registration first
            const response = await fetch(`${serverUrl}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
                credentials: 'include'
            });

            if (response.ok) {
                // Store credentials locally as backup
                const storedCredentials = this.getStoredCredentials();
                storedCredentials.push({ username, password });
                localStorage.setItem('credentials', JSON.stringify(storedCredentials));
                localStorage.setItem('serverUrl', serverUrl);

                // Switch to login form
                this.toggleForms();
                alert('Registration successful! Please login.');
            } else {
                const errorData = await response.json();
                alert(errorData.message || 'Registration failed');
            }
        } catch (error) {
            console.error('Registration error:', error);
            alert('Could not connect to server. Please check the server IP and try again.');
        }
    }

    private getStoredCredentials(): StoredCredentials[] {
        const stored = localStorage.getItem('credentials');
        return stored ? JSON.parse(stored) : [];
    }

    private checkStoredCredentials() {
        const currentUser = localStorage.getItem('currentUser');
        const username = localStorage.getItem('username');
        const password = localStorage.getItem('password');

        if (currentUser && username && password) {
            // Verify with server if possible
            this.verifyStoredCredentials(username, password).then(valid => {
                if (valid) {
                    this.hideAuthForm();
                } else {
                    // Fallback to local verification
                    const storedCredentials = this.getStoredCredentials();
                    const userExists = storedCredentials.find(cred => 
                        cred.username === username && cred.password === password
                    );
                    if (!userExists) {
                        this.logout();
                    }
                }
            });
        }
    }

    private async verifyStoredCredentials(username: string, password: string): Promise<boolean> {
        try {
            const response = await fetch(`${this.serverUrl}/auth/verify`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
                credentials: 'include'
            });
            return response.ok;
        } catch (error) {
            console.error('Verification error:', error);
            return false;
        }
    }

    private hideAuthForm() {
        this.authContainer.classList.add('hidden');
    }

    public showAuthForm() {
        this.authContainer.classList.remove('hidden');
    }

    public logout() {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('username');
        localStorage.removeItem('password');
        
        // Attempt server logout
        fetch(`${this.serverUrl}/auth/logout`, {
            method: 'POST',
            credentials: 'include'
        }).catch(error => {
            console.error('Logout error:', error);
        });

        this.showAuthForm();
    }
} 