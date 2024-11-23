import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { fido2Get, fido2Create } from '@ownid/webauthn';
import { MatDialog } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { MatDialogModule } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';

// Modal Component for Registration Success
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Inject } from '@angular/core';

@Component({
  selector: 'app-success-dialog',
  template: `
    <h1 mat-dialog-title>{{ data.title }}</h1>
    <div mat-dialog-content>
      <p>{{ data.message }}</p>
    </div>
    <div mat-dialog-actions>
      <button mat-button (click)="close()">Close</button>
    </div>
  `,
})
export class SuccessDialogComponent {
  constructor(
    private dialog: MatDialog,
    @Inject(MAT_DIALOG_DATA) public data: { title: string; message: string }
  ) {}

  close() {
    this.dialog.closeAll();
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

      <!-- Feedback Messages -->
      <div *ngIf="loginSuccess" class="success-message">
        Login successful!
      </div>
      <div *ngIf="errorMessage" class="error-message">
        {{ errorMessage }}
      </div>
    </div>
  `,
  standalone: true,
  imports: [FormsModule, CommonModule, HttpClientModule, MatDialogModule],
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
      .success-message {
        color: green;
        margin-top: 20px;
        height: 100px;
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
  loginSuccess: boolean = false;
  errorMessage: string | null = null;

  constructor(private http: HttpClient, private dialog: MatDialog) {}

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
  
         // Open success dialog
         this.dialog.open(SuccessDialogComponent, {
          data: {
            title: 'register Successful',
            message: 'You have registered in successfully!',
          },
        });
    } catch (error) {
      console.error('Registration failed:', error);
      this.errorMessage = 'Registration failed. Please try again.';
    }
  }
  

  // async loginStart() {
  //   try {
  //     console.log('Starting login for username:', this.username);
  //     const response = await firstValueFrom(this.http.post('/login/start', { username: this.username }));
  //     console.log('Received login challenge response:', response);
  
  //     const options = response as PublicKeyCredentialRequestOptions;
  //     console.log('Login options:', options);
  
  //     const assertion = await fido2Get(options, this.username);
  //     console.log('Assertion data for login:', assertion);
  
  //     const loginResponse = await firstValueFrom(this.http.post('/login/finish', assertion));
  //     console.log('Login finish response:', loginResponse);
  
  //     this.loginSuccess = true;
  //     this.errorMessage = null;
  //   } catch (error) {
  //     console.error('Login failed:', error);
  //     this.errorMessage = 'Login failed. Please try again.';
  //   }
  // }

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
  
      // Open success dialog
      this.dialog.open(SuccessDialogComponent, {
        data: {
          title: 'Login Successful',
          message: 'You have logged in successfully!',
        },
      });
  
      this.loginSuccess = true;
      this.errorMessage = null;
    } catch (error) {
      console.error('Login failed:', error);
      this.errorMessage = 'Login failed. Please try again.';
    }
  }
  
  
}
