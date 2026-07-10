import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

const API = 'https://linkora-wedding-backend.onrender.com/api/admin';
// const API = 'http://127.0.0.1:5000/api/admin';
// const API = 'https://weddingplatformbackend.onrender.com/api/admin';

@Injectable({ providedIn: 'root' })
export class AdminService {

  constructor(private http: HttpClient) {}

  getEvents() {
    return this.http.get(`${API}/events`);
  }

  createEvent(data: any) {
    return this.http.post(`${API}/events`, data);
  }

  updateEvent(id: string, data: any) {
    return this.http.put(`${API}/events/${id}`, data);
  }
}