import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../services/admin.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin.component.html'
})
export class AdminComponent implements OnInit {

  events: any[] = [];
  selectedEvent: any = null;

  form: any = this.getEmptyForm();

  constructor(private api: AdminService) {}

  ngOnInit() {
    this.loadEvents();
  }

  // ✅ EMPTY FORM
  getEmptyForm() {
    return {
      slug: '',
      date: '',
      groom: '',
      bride: '',
      location: '',

      // ✅ PARENTS ADDED
      parents: {
        groom: '',
        bride: ''
      },

      gallery: [],
      story: [],
      schedule: []
    };
  }

  // ✅ LOAD EVENTS
  loadEvents() {
    this.api.getEvents().subscribe((res: any) => {
      this.events = res;
    });
  }

  // ✅ SELECT EVENT (EDIT)
  selectEvent(e: any) {
    this.selectedEvent = e;

    this.form = {
      ...e,

      // ✅ IMPORTANT FIX
      parents: e.parents || {
        groom: '',
        bride: ''
      },

      gallery: e.gallery || [],
      story: e.story || [],
      schedule: e.schedule || []
    };
  }

  // ✅ CREATE NEW EVENT
  newEvent() {
    this.selectedEvent = null;
    this.form = this.getEmptyForm();
  }

  // ✅ SAVE EVENT
  saveEvent() {
    if (this.selectedEvent) {
      this.api.updateEvent(this.selectedEvent._id, this.form).subscribe(() => {
        alert('Updated!');
        this.loadEvents();
      });
    } else {
      this.api.createEvent(this.form).subscribe(() => {
        alert('Created!');
        this.loadEvents();
        this.form = this.getEmptyForm();
      });
    }
  }

  // ✅ GALLERY
  addImage() {
    this.form.gallery.push('');
  }

  removeImage(i: number) {
    this.form.gallery.splice(i, 1);
  }

  // ✅ STORY
  addStory() {
    this.form.story.push({ title: '', description: '' });
  }

  removeStory(i: number) {
    this.form.story.splice(i, 1);
  }

  // ✅ SCHEDULE
  addSchedule() {
    this.form.schedule.push({ name: '', time: '' });
  }

  removeSchedule(i: number) {
    this.form.schedule.splice(i, 1);
  }

}