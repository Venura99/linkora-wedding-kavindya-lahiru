import {
  Component, OnInit, OnDestroy, AfterViewInit,
  ChangeDetectorRef, ChangeDetectionStrategy, NgZone
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

/* ════════════════════════════════════════════════════════════
   THEME — AFTERGLOW · A CINEMATIC LOVE LETTER
   "A horizon develops like film. The sun rises. A new chapter begins."
   Palette: Ink Black · Dusk Plum · Ember Coral · Sun Gold · Cream Silk · Soft Sage
   ════════════════════════════════════════════════════════════ */

interface Petal {            // kept name 'Petal' but visually = floating gold spark/ember
  id: number;
  x: number;
  size: number;
  delay: number;
  duration: number;
  colorIdx: number;
  opacity: number;
}

@Component({
  selector: 'app-event',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './event.component.html',
  styleUrls: ['./event.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventComponent implements OnInit, OnDestroy, AfterViewInit {

  event: any = null;
  mapUrl!: SafeResourceUrl;
  isPlaying = false;
  private isOpening = false;

  // Guest personal invite (RSVP)
  guest: any = null;
  guestToken: string | null = null;
  rsvpSubmitted = false;

  // Memory wall
  memories: any[] = [];
  selectedMemoryFile: File | null = null;
  isUploadingMemory = false;
  memoryUploadSuccess = false;

  // Hero typewriter
  displayGroom = '';
  displayBride = '';
  private typeIntervals: any[] = [];
  private typeTimeouts: any[]  = [];

  // Countdown
  countdown     = { days: 0, hours: 0, minutes: 0, seconds: 0 };
  prevCountdown = { days: 0, hours: 0, minutes: 0, seconds: 0 };
  private timerInterval: any;
  // Solar arc progress (0 → 1) used to position the sun on the SVG arc
  sunProgress = 0;

  // Background slideshow
  bgSlides: string[] = [];
  activeBgIndex = 0;
  private bgInterval: any;

  // Floating embers (kept as 'hearts' so existing trackBy works)
  hearts: Petal[] = [];
  private heartIdCounter = 0;
  private heartSpawnInterval: any;

  // Gallery
  galleryIndex = 0;
  private galleryAutoInterval: any;

  // Lightbox
  showLightbox  = false;
  currentIndex  = 0;
  currentImage  = '';

  // Template helpers
  readonly filmHoles = Array(14).fill(0);
  readonly HEART_PATH = '';

  // Chapter Reel — story numeral card images
  readonly STORY_IMAGES = [
    '/assets/story-images/image1.JPG',
    '/assets/story-images/image2.JPG',
    '/assets/story-images/image3.JPG',
    '/assets/story-images/image4.JPG',
  ];
  storyImage(i: number): string {
    return this.STORY_IMAGES[i % this.STORY_IMAGES.length];
  }

  // Afterglow palette — ember coral / sun gold / cream silk / sage
  readonly HEART_COLORS = [
    '#ff6b5b', // ember coral
    '#ffb86b', // sun gold
    '#f5ede1', // cream silk
    '#ff8c6b', // warm ember
    '#9bb89b', // soft sage
    '#ffd29a', // pale sun
  ];

  // ── Solar arc helpers (for the SVG countdown) ────────────
  // arc center = (50, 55), radius = 45 in viewBox 100x60
  get sunX(): number {
    const angle = -180 + this.sunProgress * 180;
    return 50 + 45 * Math.cos((angle * Math.PI) / 180);
  }
  get sunY(): number {
    const angle = -180 + this.sunProgress * 180;
    return 55 + 45 * Math.sin((angle * Math.PI) / 180);
  }
  // 11 ticks along the arc
  readonly arcTicks = Array.from({ length: 11 }, (_, i) => i);
  tickX1(i: number): number {
    const a = -180 + (i / 10) * 180;
    return 50 + 45 * Math.cos((a * Math.PI) / 180);
  }
  tickY1(i: number): number {
    const a = -180 + (i / 10) * 180;
    return 55 + 45 * Math.sin((a * Math.PI) / 180);
  }
  tickX2(i: number): number {
    const a = -180 + (i / 10) * 180;
    return 50 + 47 * Math.cos((a * Math.PI) / 180);
  }
  tickY2(i: number): number {
    const a = -180 + (i / 10) * 180;
    return 55 + 47 * Math.sin((a * Math.PI) / 180);
  }

  constructor(
    private route:     ActivatedRoute,
    private api:       ApiService,
    private sanitizer: DomSanitizer,
    private cdr:       ChangeDetectorRef,
    private ngZone:    NgZone
  ) {}

  ngOnInit() {
    this.spawnInitialHearts();
    this.startHeartSpawner();

    this.guestToken = this.route.snapshot.paramMap.get('token');

    if (this.guestToken) {
      this.api.getGuestByToken(this.guestToken).subscribe(res => {
        this.guest = res.guest;
        this.rsvpSubmitted = this.guest.attending !== null;
        this.setupEvent(res.event);
      });
    } else {
      const slug = this.route.snapshot.paramMap.get('slug');
      this.api.getEvent(slug!).subscribe(res => this.setupEvent(res));
    }
  }

  private setupEvent(res: any) {
    this.event = res;

    this.mapUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://maps.google.com/maps?q=${encodeURIComponent(res.location)}&output=embed`
    );

    if (res.gallery?.length >= 2) {
      this.bgSlides = res.gallery.slice(0, 5);
    } else {
      this.bgSlides = [
        '/images/wedding-bg-1.jpg',
        '/images/wedding-bg-2.jpg',
        '/images/wedding-bg-3.jpg',
        '/images/wedding-bg-4.jpg',
      ];
    }

    this.startBgSlideshow();
    this.startGalleryAuto();
    this.startCountdown();

    this.api.getMemoriesBySlug(res.slug).subscribe(memories => {
      this.memories = memories;
      this.cdr.detectChanges();
    });

    this.cdr.detectChanges();
  }

  ngAfterViewInit() {
    setTimeout(() => this.initScrollObserver(), 800);
  }

  // ── HORIZON / SUN-RISE OPEN ANIMATION ───────────────────
  // Replaces the velvet curtain with: sky parts → horizon line draws →
  // sun rises → cream wash flares → reveal.
  openEnvelope(audio: HTMLAudioElement) {
    if (!this.isPlaying) {
      audio.play().then(() => {
        this.isPlaying = true;
        this.cdr.detectChanges();
      }).catch(() => {});
    }

    if (this.isOpening) return;
    this.isOpening = true;

    const sceneEl  = document.getElementById('envelopeScene') as HTMLElement | null;
    const letterEl = document.getElementById('letterReveal')  as HTMLElement | null;
    const flashEl  = document.getElementById('filmBurn')      as HTMLElement | null;

    if (!sceneEl) return;

    // Step 1: trigger the sky-part / horizon-draw
    sceneEl.classList.add('seal-cracked');

    // Step 2: sun lifts above the horizon
    setTimeout(() => {
      if (sceneEl) sceneEl.classList.add('flap-open');
    }, 380);

    // Step 3: cream/ember flare at peak
    setTimeout(() => {
      if (flashEl) flashEl.classList.add('burning');
    }, 1000);

    // Step 4: cross-fade to the reveal content
    setTimeout(() => {
      if (sceneEl) {
        sceneEl.style.transition  = 'opacity 0.5s ease';
        sceneEl.style.opacity     = '0';
        sceneEl.style.pointerEvents = 'none';
      }
      if (letterEl) {
        letterEl.style.display = 'block';
        letterEl.getBoundingClientRect();
        letterEl.classList.add('revealed');

        setTimeout(() => {
          this.animateNames();
          this.cdr.detectChanges();
        }, 500);

        setTimeout(() => this.initScrollObserver(), 1400);
      }
    }, 1400);

    // Step 5: remove scene from flow
    setTimeout(() => {
      if (sceneEl)  sceneEl.style.display  = 'none';
      if (flashEl)  flashEl.classList.remove('burning');
    }, 2400);

    const hint = document.querySelector('.csc-hint') as HTMLElement;
    if (hint) hint.style.opacity = '0';

    this.cdr.detectChanges();
  }

  // ── BACKGROUND SLIDESHOW ─────────────────────────────────
  startBgSlideshow() {
    this.bgInterval = setInterval(() => {
      this.activeBgIndex = (this.activeBgIndex + 1) % this.bgSlides.length;
      this.cdr.detectChanges();
    }, 6500);
  }

  isBgActive(i: number): boolean {
    return i === this.activeBgIndex;
  }

  // ── GALLERY ──────────────────────────────────────────────
  get galleryImages(): string[] { return this.event?.gallery || []; }
  get galleryDots(): number[]   { return this.galleryImages.map((_, i) => i); }

  goToSlide(n: number) {
    this.galleryIndex = (n + this.galleryImages.length) % this.galleryImages.length;
    this.cdr.detectChanges();
    this.resetGalleryAuto();
  }
  prevSlide() { this.goToSlide(this.galleryIndex - 1); }
  nextSlide() { this.goToSlide(this.galleryIndex + 1); }

  get galleryTranslate(): string {
    return `translateX(-${this.galleryIndex * 100}%)`;
  }

  startGalleryAuto() {
    this.galleryAutoInterval = setInterval(() => {
      this.galleryIndex = (this.galleryIndex + 1) % Math.max(this.galleryImages.length, 1);
      this.cdr.detectChanges();
    }, 5200);
  }
  resetGalleryAuto() {
    clearInterval(this.galleryAutoInterval);
    this.startGalleryAuto();
  }

  // Polaroid fan-deck transform (active card pulls forward)
  polaroidTransform(i: number, total: number): string {
    const offset = i - (total - 1) / 2;
    if (i === this.galleryIndex) {
      return `translate(0, -28px) rotate(0deg) scale(1.12)`;
    }
    return `translate(${offset * 38}px, ${Math.abs(offset) * 12}px) rotate(${offset * 8}deg)`;
  }
  polaroidZ(i: number): number {
    return i === this.galleryIndex ? 50 : 10 + i;
  }

  // ── EMBERS / FLOATING SPARKS ────────────────────────────
  spawnInitialHearts() {
    for (let i = 0; i < 18; i++) {
      setTimeout(() => this.spawnHeart(), i * 420);
    }
  }

  startHeartSpawner() {
    this.ngZone.runOutsideAngular(() => {
      this.heartSpawnInterval = setInterval(() => {
        this.ngZone.run(() => {
          this.spawnHeart();
          this.cdr.detectChanges();
        });
      }, 950);
    });
  }

  spawnHeart() {
    const id = this.heartIdCounter++;
    const petal: Petal = {
      id,
      x:        Math.random() * 100,
      size:     Math.random() * 6 + 3,         // small embers
      delay:    Math.random() * 4,
      duration: Math.random() * 14 + 16,
      colorIdx: Math.floor(Math.random() * this.HEART_COLORS.length),
      opacity:  0.5 + Math.random() * 0.45,
    };
    this.hearts.push(petal);
    setTimeout(() => {
      this.hearts = this.hearts.filter(h => h.id !== id);
      this.cdr.detectChanges();
    }, (petal.duration + petal.delay + 2) * 1000);
  }

  heartColor(idx: number): string {
    return this.HEART_COLORS[idx % this.HEART_COLORS.length];
  }

  trackHeart(_: number, h: Petal): number { return h.id; }

  // ── TYPEWRITER (kept for compatibility, but template uses
  // letter-reveal instead — these stay so existing code works) ──
  animateNames() {
    this.typeIntervals.forEach(clearInterval);
    this.typeTimeouts.forEach(clearTimeout);
    this.typeIntervals = [];
    this.typeTimeouts  = [];

    // Show full strings immediately so the "develop" CSS animation
    // on each letter handles the entry choreography.
    this.displayGroom = this.event?.groom || '';
    this.displayBride = this.event?.bride || '';
    this.cdr.detectChanges();
  }

  // Letter splitter for the cinematic reveal in the hero
  splitLetters(word: string): string[] {
    return (word || '').split('');
  }

  // ── COUNTDOWN ─────────────────────────────────────────────
  startCountdown() {
    const target = new Date(this.event.date + 'T16:00:00');
    // Solar-arc baseline: progress = 1 - (timeLeft / 1 year)
    const totalSpan = 365 * 86_400_000;
    const run = () => {
      const diff = target.getTime() - Date.now();
      if (diff > 0) {
        const next = {
          days:    Math.floor(diff / 86_400_000),
          hours:   Math.floor((diff % 86_400_000) / 3_600_000),
          minutes: Math.floor((diff % 3_600_000)  / 60_000),
          seconds: Math.floor((diff % 60_000)     / 1_000),
        };
        this.prevCountdown = { ...this.countdown };
        this.countdown = next;
        this.sunProgress = Math.min(1, Math.max(0, 1 - diff / totalSpan));
        this.cdr.detectChanges();
      } else {
        this.sunProgress = 1;
        clearInterval(this.timerInterval);
        this.cdr.detectChanges();
      }
    };
    run();
    this.timerInterval = setInterval(run, 1000);
  }

  get fDays():    string { return String(this.countdown.days).padStart(3, '0'); }
  get fHours():   string { return String(this.countdown.hours).padStart(2, '0'); }
  get fMinutes(): string { return String(this.countdown.minutes).padStart(2, '0'); }
  get fSeconds(): string { return String(this.countdown.seconds).padStart(2, '0'); }

  tickDays():    boolean { return this.countdown.days    !== this.prevCountdown.days; }
  tickHours():   boolean { return this.countdown.hours   !== this.prevCountdown.hours; }
  tickMinutes(): boolean { return this.countdown.minutes !== this.prevCountdown.minutes; }
  tickSeconds(): boolean { return this.countdown.seconds !== this.prevCountdown.seconds; }

  // ── SCROLL OBSERVER ───────────────────────────────────────
  initScrollObserver() {
    const io = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          io.unobserve(e.target);
        }
      }),
      { threshold: 0.07 }
    );
    document.querySelectorAll('.fade-up, .fst-frame, .sched-item').forEach(el => io.observe(el));
  }

  // ── LIGHTBOX ──────────────────────────────────────────────
  openLightbox(index: number) {
    this.currentIndex = index;
    this.currentImage = this.event.gallery[index];
    this.showLightbox = true;
    document.body.style.overflow = 'hidden';
    this.cdr.detectChanges();
  }

  closeLightbox(event?: MouseEvent) {
    if (!event || (event.target as HTMLElement).classList.contains('lb-overlay')) {
      this.showLightbox = false;
      document.body.style.overflow = '';
      this.cdr.detectChanges();
    }
  }

  prevLightbox() {
    this.currentIndex = (this.currentIndex - 1 + this.event.gallery.length) % this.event.gallery.length;
    this.currentImage = this.event.gallery[this.currentIndex];
    this.cdr.detectChanges();
  }

  nextLightbox() {
    this.currentIndex = (this.currentIndex + 1) % this.event.gallery.length;
    this.currentImage = this.event.gallery[this.currentIndex];
    this.cdr.detectChanges();
  }

  // ── MUSIC ─────────────────────────────────────────────────
  async toggleMusic(audio: HTMLAudioElement) {
    try {
      if (this.isPlaying) { audio.pause(); }
      else { await audio.play(); }
      this.isPlaying = !this.isPlaying;
      this.cdr.detectChanges();
    } catch (e) { console.warn(e); }
  }

  // ── RSVP ──────────────────────────────────────────────────
  submitRsvp(e: Event) {
    e.preventDefault();
    if (!this.guestToken) return;

    const form = e.target as HTMLFormElement;
    const data = {
      attending: (form.querySelector('[name="attending"]') as HTMLSelectElement).value === 'true',
      wish:      (form.querySelector('[name="wish"]')      as HTMLTextAreaElement)?.value || '',
    };

    this.api.submitGuestRsvp(this.guestToken, data).subscribe(guest => {
      this.guest = guest;
      this.rsvpSubmitted = true;
      this.cdr.detectChanges();
    });
  }

  // ── MEMORY WALL ───────────────────────────────────────────
  onMemoryFileSelected(e: Event) {
    const input = e.target as HTMLInputElement;
    this.selectedMemoryFile = input.files?.[0] || null;
  }

  submitMemory(e: Event) {
    e.preventDefault();
    if (!this.selectedMemoryFile || this.isUploadingMemory) return;

    const form = e.target as HTMLFormElement;
    const guestName = this.guest?.name
      || (form.querySelector('[name="guestName"]') as HTMLInputElement)?.value
      || '';
    const message = (form.querySelector('[name="message"]') as HTMLTextAreaElement)?.value || '';

    const formData = new FormData();
    formData.append('eventId', this.event._id);
    formData.append('guestName', guestName);
    formData.append('message', message);
    formData.append('image', this.selectedMemoryFile);

    this.isUploadingMemory = true;
    this.api.uploadMemory(formData).subscribe({
      next: () => {
        this.isUploadingMemory = false;
        this.memoryUploadSuccess = true;
        this.selectedMemoryFile = null;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isUploadingMemory = false;
        this.cdr.detectChanges();
      }
    });
  }

  // ── CLEANUP ───────────────────────────────────────────────
  ngOnDestroy() {
    clearInterval(this.timerInterval);
    clearInterval(this.bgInterval);
    clearInterval(this.heartSpawnInterval);
    clearInterval(this.galleryAutoInterval);
    this.typeIntervals.forEach(clearInterval);
    this.typeTimeouts.forEach(clearTimeout);
  }
}
