// import { Component } from '@angular/core';
// import { HttpClient } from '@angular/common/http';
// import { fido2Get, fido2Create } from '@ownid/webauthn';
// import { MatDialog } from '@angular/material/dialog';
// import { FormsModule } from '@angular/forms';
// import { CommonModule } from '@angular/common';
// import { HttpClientModule } from '@angular/common/http';
// import { MatDialogModule } from '@angular/material/dialog';

// // Define a simple modal component for showing the success message
// @Component({
//   selector: 'app-registration-success-dialog',
//   template: `
//     <h1 mat-dialog-title>Registration Successful</h1>
//     <div mat-dialog-content>
//       <p>Your registration has been completed successfully.</p>
//     </div>
//     <div mat-dialog-actions>
//       <button mat-button (click)="close()">Close</button>
//     </div>
//   `,
// })
// export class RegistrationSuccessDialogComponent {
//   constructor() {}

//   close() {
//     // Close the dialog
//   }
// }

// @Component({
//   selector: 'app-root',
//   template: `
//     <div>
//       <h1>Passkeys Example</h1>
//       <input [(ngModel)]="username" placeholder="Username" />
//       <button (click)="registerStart()">Register</button>
//       <button (click)="loginStart()">Login</button>

//       <!-- Success message -->
//       <div *ngIf="loginSuccess" class="success-message">
//         Login successful!
//       </div>
//     </div>
//   `,
//   standalone: true,
//   imports: [FormsModule, CommonModule, HttpClientModule, MatDialogModule],
// })
// export class AppComponent {
//   username: string = '';
//   loginSuccess: boolean = false;

//   constructor(private http: HttpClient, private dialog: MatDialog) {}

//   async registerStart() {
//     const publicKey = await this.http.post('/register/start', { username: this.username }).toPromise();
//     const fidoData = await fido2Create(publicKey, this.username);
//     const response = await this.http.post<boolean>('/register/finish', fidoData).toPromise();
//     console.log(response);

//     // Show the modal after successful registration
//     this.dialog.open(RegistrationSuccessDialogComponent);
//   }

//   async loginStart() {
//     const response = await this.http.post('/login/start', { username: this.username }).toPromise();
//     const options = response as PublicKeyCredentialRequestOptions;
//     const assertion = await fido2Get(options, this.username);
//     await this.http.post('/login/finish', assertion).toPromise();
//     console.log('Login successful');

//     // Update the login success state to show the message
//     this.loginSuccess = true;
//   }
// }
