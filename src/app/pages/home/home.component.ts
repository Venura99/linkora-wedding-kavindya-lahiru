import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen flex flex-col items-center justify-center text-center">
      <h1 class="text-4xl text-gold mb-4">Wedding Invitation Platform</h1>
      <p>Create and share beautiful wedding invitations</p>
    </div>
  `
})
export class HomeComponent {}