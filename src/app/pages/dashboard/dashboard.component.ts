import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent implements OnInit {

  event: any;
  guests: any[] = [];
  filteredGuests: any[] = [];

  totalGuests = 0;
  attendingCount = 0;
  notAttendingCount = 0;
  pendingCount = 0;

  isLoading = true;

  // Add-guest form
  newGuestName = '';
  newGuestCount = 1;
  isAddingGuest = false;

  // Copy-link feedback
  copiedGuestId: string | null = null;

  // Memory wall moderation
  memories: any[] = [];
  memoryFilter: 'pending' | 'approved' = 'pending';
  isMemoriesLoading = true;

  get pendingMemories(): any[] {
    return this.memories.filter(m => m.status === 'pending');
  }
  get approvedMemories(): any[] {
    return this.memories.filter(m => m.status === 'approved');
  }
  get visibleMemories(): any[] {
    return this.memoryFilter === 'pending' ? this.pendingMemories : this.approvedMemories;
  }

  constructor(
    private route: ActivatedRoute,
    private api: ApiService
  ) {}

  ngOnInit() {
    const slug = this.route.snapshot.paramMap.get('slug');

    this.api.getEvent(slug!).subscribe((event) => {
      this.event = event;

      this.api.getGuestsByEvent(event._id).subscribe((data: any) => {
        this.guests = data;
        this.filteredGuests = [...data];

        this.calculateStats();

        this.isLoading = false;
      });

      this.api.getAllMemoriesAdmin(event._id).subscribe((data: any) => {
        this.memories = data;
        this.isMemoriesLoading = false;
      });
    });
  }

  calculateStats() {
    this.totalGuests = this.guests.reduce(
      (sum: number, g: any) => sum + (g.guestCount || 1), 0
    );

    this.attendingCount = this.guests
      .filter((g: any) => g.attending === true)
      .reduce((sum: number, g: any) => sum + (g.guestCount || 1), 0);

    this.notAttendingCount = this.guests
      .filter((g: any) => g.attending === false)
      .reduce((sum: number, g: any) => sum + (g.guestCount || 1), 0);

    this.pendingCount = this.guests
      .filter((g: any) => g.attending === null)
      .reduce((sum: number, g: any) => sum + (g.guestCount || 1), 0);
  }

  // =========================
  // ➕ ADD GUEST
  // =========================
  addGuest() {
    const name = this.newGuestName.trim();
    if (!name || this.isAddingGuest) return;

    this.isAddingGuest = true;

    this.api.createGuest({
      eventId: this.event._id,
      name,
      guestCount: this.newGuestCount || 1
    }).subscribe({
      next: (guest) => {
        this.guests = [guest, ...this.guests];
        this.filteredGuests = [...this.guests];
        this.calculateStats();

        this.newGuestName = '';
        this.newGuestCount = 1;
        this.isAddingGuest = false;
      },
      error: () => { this.isAddingGuest = false; }
    });
  }

  removeGuest(guest: any) {
    if (!confirm(`Remove ${guest.name} and their invite link?`)) return;

    this.api.deleteGuest(guest._id).subscribe(() => {
      this.guests = this.guests.filter(g => g._id !== guest._id);
      this.filteredGuests = this.filteredGuests.filter(g => g._id !== guest._id);
      this.calculateStats();
    });
  }

  // =========================
  // 🔗 INVITE LINK
  // =========================
  getInviteLink(guest: any): string {
    return `${window.location.origin}/event/${this.event.slug}/${guest.token}`;
  }

  copyLink(guest: any) {
    navigator.clipboard.writeText(this.getInviteLink(guest)).then(() => {
      this.copiedGuestId = guest._id;
      setTimeout(() => {
        if (this.copiedGuestId === guest._id) this.copiedGuestId = null;
      }, 2000);
    });
  }

  // =========================
  // 🔎 SEARCH / FILTER
  // =========================
  filterGuests(event: any) {
    const searchTerm = event.target.value.toLowerCase().trim();

    if (!searchTerm) {
      this.filteredGuests = [...this.guests];
      return;
    }

    this.filteredGuests = this.guests.filter(g =>
      g.name.toLowerCase().includes(searchTerm)
    );
  }

  // =========================
  // 📥 EXPORT CSV (Excel)
  // =========================
  exportToCSV() {
    const headers = ['Name', 'Guests', 'Status', 'Wish'];

    const rows = this.guests.map(g => [
      g.name,
      g.guestCount || 1,
      this.statusLabel(g),
      (g.wish || '').replace(/[\r\n,]+/g, ' ')
    ]);

    const csvContent = [headers, ...rows]
      .map(e => e.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `${this.event?.slug || 'wedding'}-guests.csv`);
    link.click();
  }

  statusLabel(guest: any): string {
    if (guest.attending === true) return 'Attending';
    if (guest.attending === false) return 'Not Attending';
    return 'Pending';
  }

  // =========================
  // 🖼️ MEMORY WALL MODERATION
  // =========================
  approveMemory(memory: any) {
    this.api.approveMemory(memory._id).subscribe(() => {
      memory.status = 'approved';
    });
  }

  deleteMemory(memory: any) {
    if (!confirm(`Delete this memory from ${memory.guestName}?`)) return;

    this.api.deleteMemory(memory._id).subscribe(() => {
      this.memories = this.memories.filter(m => m._id !== memory._id);
    });
  }
}
