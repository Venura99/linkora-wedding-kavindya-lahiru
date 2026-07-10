import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

const API = 'https://linkora-wedding-backend.onrender.com/api';
// const API = 'http://127.0.0.1:5000/api';
// const API = 'https://weddingplatformbackend.onrender.com/api';

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private http: HttpClient) {}

  getEvent(slug: string): Observable<any> {
    return this.http.get(`${API}/events/${slug}`);
  }

  // ── GUESTS ──────────────────────────────────────────────
  createGuest(data: { eventId: string; name: string; guestCount: number }): Observable<any> {
    return this.http.post(`${API}/guests`, data);
  }

  getGuestsByEvent(eventId: string): Observable<any> {
    return this.http.get(`${API}/guests/event/${eventId}`);
  }

  getGuestByToken(token: string): Observable<any> {
    return this.http.get(`${API}/guests/token/${token}`);
  }

  submitGuestRsvp(token: string, data: { attending: boolean; wish: string }): Observable<any> {
    return this.http.patch(`${API}/guests/token/${token}`, data);
  }

  updateGuest(id: string, data: { name: string; guestCount: number }): Observable<any> {
    return this.http.put(`${API}/guests/${id}`, data);
  }

  deleteGuest(id: string): Observable<any> {
    return this.http.delete(`${API}/guests/${id}`);
  }

  // ── MEMORIES ────────────────────────────────────────────
  uploadMemory(formData: FormData): Observable<any> {
    return this.http.post(`${API}/memories/upload`, formData);
  }

  getMemoriesBySlug(slug: string): Observable<any> {
    return this.http.get(`${API}/memories/event/${slug}`);
  }

  getAllMemoriesAdmin(eventId: string): Observable<any> {
    return this.http.get(`${API}/memories/admin/all/${eventId}`);
  }

  approveMemory(id: string): Observable<any> {
    return this.http.put(`${API}/memories/approve/${id}`, {});
  }

  deleteMemory(id: string): Observable<any> {
    return this.http.delete(`${API}/memories/${id}`);
  }
}