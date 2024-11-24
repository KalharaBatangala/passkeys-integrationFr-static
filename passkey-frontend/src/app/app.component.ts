import { Component, Input, Output, EventEmitter } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { fido2Get, fido2Create } from '@ownid/webauthn';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

// Modal Component for Success
@Component({
  selector: 'app-success-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="modal-overlay" (click)="close()">
      <div class="modal-container" (click)="$event.stopPropagation()">
        <h1 class="modal-title">{{ title }}</h1>
        <div class="modal-content">
          <p>{{ message }}</p>
        </div>
        <div class="modal-actions">
          <button class="close-button" (click)="close()">Close</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
    }

    .modal-container {
      background: white;
      border-radius: 8px;
      padding: 16px;  /* Reduced padding */
      min-width: 400px;
      max-width: 90%;
      max-height: calc(100vh - 40px);  /* Added max height */
      margin: 20px;  /* Added margin */
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      position: relative;
      overflow: auto;  /* Added scroll if content is too long */
    }

    .modal-title {
      margin: 0 0 12px 0;  /* Reduced margin */
      font-size: 20px;  /* Reduced font size */
      font-weight: 500;
      color: #333;
    }

    .modal-content {
      margin-bottom: 16px;  /* Reduced margin */
      color: #666;
      font-size: 14px;  /* Reduced font size */
      line-height: 1.4;  /* Reduced line height */
    }

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      margin-top: 16px;  /* Reduced margin */
    }

    .close-button {
      background-color: #007bff;
      color: white;
      border: none;
      padding: 8px 24px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      transition: background-color 0.2s;
    }

    .close-button:hover {
      background-color: #0056b3;
    }
  `]
})
export class SuccessDialogComponent {
  @Input() title: string = '';
  @Input() message: string = '';
  @Output() onClose = new EventEmitter<void>();

  close() {
    this.onClose.emit();
  }
}

// Main App Component
@Component({
  selector: 'app-root',
  template: `
    <div class="container">
      <h1>Passkeys Example</h1>
      <input [(ngModel)]="username" placeholder="Username" class="input-field" />
      <button (click)="registerStart()" class="button">Register</button>
      <button (click)="loginStart()" class="button">Login</button>

      <!-- Success Dialog -->
      <app-success-dialog
        *ngIf="showSuccessDialog"
        [title]="dialogTitle"
        [message]="dialogMessage"
        (onClose)="closeDialog()"
      ></app-success-dialog>

      <!-- Error Message -->
      <div *ngIf="errorMessage" class="error-message">
        {{ errorMessage }}
      </div>
    </div>
  `,
  standalone: true,
  imports: [FormsModule, CommonModule, HttpClientModule, SuccessDialogComponent],
  styles: [
    `
      .container {
        text-align: center;
        margin-top: 50px;
      }
      .input-field {
        display: block;
        margin: 10px auto;
        padding: 10px;
        width: 300px;
        font-size: 16px;
      }
      .button {
        margin: 5px;
        padding: 10px 20px;
        font-size: 16px;
      }
      .error-message {
        color: red;
        margin-top: 20px;
      }
    `,
  ],
})
export class AppComponent {
  username: string = '';
  errorMessage: string | null = null;
  showSuccessDialog: boolean = false;
  dialogTitle: string = '';
  dialogMessage: string = '';

  constructor(private http: HttpClient) {}

  showDialog(title: string, message: string) {
    this.dialogTitle = title;
    this.dialogMessage = message;
    this.showSuccessDialog = true;
  }

  closeDialog() {
    this.showSuccessDialog = false;
  }

  async registerStart() {
    try {
      console.log('Starting registration for username:', this.username);
      const publicKey = await firstValueFrom(
        this.http.post('/register/start', { username: this.username })
      );
      console.log('Received public key for registration:', publicKey);
  
      const fidoData = await fido2Create(publicKey, this.username);
      console.log('Fido data for registration:', fidoData);
  
      const response = await firstValueFrom(this.http.post<boolean>('/register/finish', fidoData));
      console.log('Registration finish response:', response);
  
      this.showDialog('Registration Successful', 'You have registered successfully!');
    } catch (error) {
      console.error('Registration failed:', error);
      this.errorMessage = 'Registration failed. Please try again.';
    }
  }

  async loginStart() {
    try {
      console.log('Starting login for username:', this.username);
      const response = await firstValueFrom(
        this.http.post('/login/start', { username: this.username })
      );
      console.log('Received login challenge response:', response);
  
      const options = response as PublicKeyCredentialRequestOptions;
      console.log('Login options:', options);
  
      const assertion = await fido2Get(options, this.username);
      console.log('Assertion data for login:', assertion);
  
      const loginResponse = await firstValueFrom(this.http.post('/login/finish', assertion));
      console.log('Login successful:', loginResponse);
  
      this.showDialog('Login Successful', 'You have logged in successfully!');
      this.errorMessage = null;
    } catch (error) {
      console.error('Login failed:', error);
      this.errorMessage = 'Login failed. Please try again.';
    }
  }
}