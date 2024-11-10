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

    // Login form elements
    private loginUsername: HTMLInputElement;
    private loginPassword: HTMLInputElement;

    // Register form elements
    private registerUsername: HTMLInputElement;
    private registerPassword: HTMLInputElement;
    private registerConfirmPassword: HTMLInputElement;

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
        
        // Form switch elements
        this.showRegisterLink = document.getElementById('showRegister')!;
        this.showLoginLink = document.getElementById('showLogin')!;

        // Bind event listeners
        this.loginButton.addEventListener('click', () => this.handleLogin());
        this.registerButton.addEventListener('click', () => this.handleRegister());
        this.showRegisterLink.addEventListener('click', () => this.toggleForms());
        this.showLoginLink.addEventListener('click', () => this.toggleForms());

        // Check for stored credentials
        this.checkStoredCredentials();
    }

    private toggleForms() {
        this.loginForm.classList.toggle('hidden');
        this.registerForm.classList.toggle('hidden');
    }

    private async handleLogin() {
        const username = this.loginUsername.value;
        const password = this.loginPassword.value;

        const storedCredentials = this.getStoredCredentials();
        const userExists = storedCredentials.find(cred => 
            cred.username === username && cred.password === password
        );

        if (userExists) {
            // Store current user
            localStorage.setItem('currentUser', username);
            this.hideAuthForm();
        } else {
            alert('Invalid username or password');
        }
    }

    private async handleRegister() {
        const username = this.registerUsername.value;
        const password = this.registerPassword.value;
        const confirmPassword = this.registerConfirmPassword.value;

        if (password !== confirmPassword) {
            alert('Passwords do not match');
            return;
        }

        const storedCredentials = this.getStoredCredentials();
        if (storedCredentials.some(cred => cred.username === username)) {
            alert('Username already exists');
            return;
        }

        // Store new credentials
        storedCredentials.push({ username, password });
        localStorage.setItem('credentials', JSON.stringify(storedCredentials));

        // Switch to login form
        this.toggleForms();
        alert('Registration successful! Please login.');
    }

    private getStoredCredentials(): StoredCredentials[] {
        const stored = localStorage.getItem('credentials');
        return stored ? JSON.parse(stored) : [];
    }

    private checkStoredCredentials() {
        const currentUser = localStorage.getItem('currentUser');
        if (currentUser) {
            this.hideAuthForm();
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
        this.showAuthForm();
    }
} 