export class AuthUI {
    private authContainer: HTMLElement;
    private loginForm: HTMLElement;
    private loginButton: HTMLElement;
    private loginUsername: HTMLInputElement;
    private loginPassword: HTMLInputElement;
    private showRegisterLink: HTMLElement;

    constructor() {
        // Get DOM elements
        this.authContainer = document.getElementById('authContainer')!;
        this.loginForm = document.getElementById('loginForm')!;
        this.loginButton = document.getElementById('loginButton')!;
        this.loginUsername = document.getElementById('loginUsername') as HTMLInputElement;
        this.loginPassword = document.getElementById('loginPassword') as HTMLInputElement;
        this.showRegisterLink = document.getElementById('showRegister')!;

        // Bind event listeners
        this.loginButton.addEventListener('click', () => this.handleLogin());
    }

    private async handleLogin() {
        const username = this.loginUsername.value;
        const password = this.loginPassword.value;

        // TODO: Add actual authentication logic here
        console.log('Login attempted with:', username, password);

        // For now, just hide the form
        this.hideAuthForm();
    }

    private hideAuthForm() {
        this.authContainer.classList.add('hidden');
    }

    public showAuthForm() {
        this.authContainer.classList.remove('hidden');
    }
} 