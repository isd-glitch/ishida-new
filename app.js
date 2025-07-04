/**
 * Cyberpunk School Site - Optimized JavaScript
 * Performance-focused with memory management and throttling
 */

class PerformanceOptimizer {
  constructor() {
    this.rafId = null;
    this.isLowPowerMode = false;
    this.particleLimit = this.getParticleLimit();
    this.checkPerformance();
  }

  getParticleLimit() {
    const screenArea = window.innerWidth * window.innerHeight;
    const deviceMemory = navigator.deviceMemory || 4;
    
    if (screenArea > 2073600 && deviceMemory >= 8) return 120; // 1920x1080+ high memory
    if (screenArea > 1228800) return 80; // 1280x960+
    if (screenArea > 614400) return 50; // 1024x600+
    return 30; // Small screens/low memory
  }

  checkPerformance() {
    // Enable low power mode on mobile or low-end devices
    this.isLowPowerMode = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                         navigator.hardwareConcurrency <= 2 ||
                         (navigator.deviceMemory && navigator.deviceMemory < 4);
  }

  throttle(func, limit) {
    let inThrottle;
    return function() {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  debounce(func, delay) {
    let timeoutId;
    return function(...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
  }
}

class ParticleSystem {
  constructor(canvas, optimizer) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.optimizer = optimizer;
    this.particles = [];
    this.connections = [];
    this.mouse = { x: 0, y: 0 };
    this.mouseTrail = [];
    this.lastParticleCreation = 0;
    this.animationRunning = false;
    
    this.init();
  }

  init() {
    this.resizeCanvas();
    this.setupEventListeners();
    
    // Only start particle system if not in low power mode
    if (!this.optimizer.isLowPowerMode) {
      this.start();
    }
  }

  resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    
    // Use lower resolution on mobile for better performance
    const scale = this.optimizer.isLowPowerMode ? Math.min(dpr, 1.5) : dpr;
    
    this.canvas.width = rect.width * scale;
    this.canvas.height = rect.height * scale;
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';
    
    this.ctx.scale(scale, scale);
    this.canvas.style.display = 'block';
  }

  setupEventListeners() {
    // Throttled mouse movement
    const throttledMouseMove = this.optimizer.throttle((e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
      this.addToTrail(e.clientX, e.clientY);
      this.createParticles(e.clientX, e.clientY, 2);
    }, this.optimizer.isLowPowerMode ? 100 : 50);

    // Debounced resize
    const debouncedResize = this.optimizer.debounce(() => {
      this.resizeCanvas();
    }, 250);

    window.addEventListener('mousemove', throttledMouseMove, { passive: true });
    window.addEventListener('resize', debouncedResize, { passive: true });

    // Touch support with reduced frequency
    if ('ontouchstart' in window) {
      const throttledTouch = this.optimizer.throttle((e) => {
        if (e.touches.length > 0) {
          const touch = e.touches[0];
          this.mouse.x = touch.clientX;
          this.mouse.y = touch.clientY;
          this.createParticles(touch.clientX, touch.clientY, 3);
        }
      }, 150);

      this.canvas.addEventListener('touchmove', throttledTouch, { passive: true });
    }
  }

  addToTrail(x, y) {
    this.mouseTrail.push({ x, y, life: 1 });
    if (this.mouseTrail.length > 15) {
      this.mouseTrail.shift();
    }
  }

  createParticles(x, y, count = 1) {
    const now = performance.now();
    if (now - this.lastParticleCreation < 16 || this.particles.length >= this.optimizer.particleLimit) {
      return; // Limit particle creation rate
    }

    this.lastParticleCreation = now;
    
    for (let i = 0; i < count; i++) {
      if (this.particles.length < this.optimizer.particleLimit) {
        this.particles.push(new CyberParticle(
          x + (Math.random() - 0.5) * 20,
          y + (Math.random() - 0.5) * 20
        ));
      }
    }
  }

  start() {
    if (this.animationRunning) return;
    this.animationRunning = true;
    this.animate();
    
    // Create ambient particles periodically
    this.ambientParticleInterval = setInterval(() => {
      if (this.particles.length < this.optimizer.particleLimit * 0.7) {
        const edge = Math.random();
        let x, y;
        
        if (edge < 0.25) {
          x = Math.random() * this.canvas.width;
          y = 0;
        } else if (edge < 0.5) {
          x = this.canvas.width;
          y = Math.random() * this.canvas.height;
        } else if (edge < 0.75) {
          x = Math.random() * this.canvas.width;
          y = this.canvas.height;
        } else {
          x = 0;
          y = Math.random() * this.canvas.height;
        }
        
        this.createParticles(x, y, 1);
      }
    }, this.optimizer.isLowPowerMode ? 3000 : 2000);
  }

  stop() {
    this.animationRunning = false;
    if (this.optimizer.rafId) {
      cancelAnimationFrame(this.optimizer.rafId);
    }
    if (this.ambientParticleInterval) {
      clearInterval(this.ambientParticleInterval);
    }
  }

  updateConnections() {
    this.connections = [];
    const maxDistance = this.optimizer.isLowPowerMode ? 80 : 100;
    
    // Only check connections for nearby particles to improve performance
    for (let i = 0; i < this.particles.length; i++) {
      let connectionCount = 0;
      for (let j = i + 1; j < this.particles.length && connectionCount < 3; j++) {
        const dx = this.particles[j].x - this.particles[i].x;
        const dy = this.particles[j].y - this.particles[i].y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < maxDistance) {
          this.connections.push({
            p1: this.particles[i],
            p2: this.particles[j],
            distance: distance,
            maxDistance: maxDistance
          });
          connectionCount++;
        }
      }
    }
  }

  animate() {
    if (!this.animationRunning) return;

    // Clear canvas with trail effect
    this.ctx.fillStyle = 'rgba(10, 10, 11, 0.08)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Update and draw particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      particle.update(this.mouse, this.canvas);
      
      if (particle.life <= 0 || particle.isOffscreen(this.canvas)) {
        this.particles.splice(i, 1);
      } else {
        particle.draw(this.ctx);
      }
    }

    // Update and draw connections (less frequently)
    if (this.particles.length > 1 && !this.optimizer.isLowPowerMode) {
      this.updateConnections();
      this.connections.forEach(conn => this.drawConnection(conn));
    }

    // Draw mouse trail
    this.drawMouseTrail();

    this.optimizer.rafId = requestAnimationFrame(() => this.animate());
  }

  drawConnection(conn) {
    const opacity = (1 - conn.distance / conn.maxDistance) * 0.3;
    this.ctx.save();
    this.ctx.globalAlpha = opacity;
    
    const gradient = this.ctx.createLinearGradient(
      conn.p1.x, conn.p1.y, conn.p2.x, conn.p2.y
    );
    gradient.addColorStop(0, `hsl(${conn.p1.hue}, 100%, 50%)`);
    gradient.addColorStop(1, `hsl(${conn.p2.hue}, 100%, 50%)`);
    
    this.ctx.strokeStyle = gradient;
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(conn.p1.x, conn.p1.y);
    this.ctx.lineTo(conn.p2.x, conn.p2.y);
    this.ctx.stroke();
    this.ctx.restore();
  }

  drawMouseTrail() {
    if (this.mouseTrail.length < 2) return;

    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(0, 255, 255, 0.2)';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(this.mouseTrail[0].x, this.mouseTrail[0].y);
    
    for (let i = 1; i < this.mouseTrail.length; i++) {
      this.ctx.lineTo(this.mouseTrail[i].x, this.mouseTrail[i].y);
    }
    this.ctx.stroke();
    this.ctx.restore();

    // Fade trail
    this.mouseTrail.forEach(point => point.life *= 0.95);
    this.mouseTrail = this.mouseTrail.filter(point => point.life > 0.1);
  }
}

class CyberParticle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 2;
    this.vy = (Math.random() - 0.5) * 2;
    this.size = Math.random() * 3 + 1;
    this.life = 1;
    this.decay = Math.random() * 0.015 + 0.005;
    this.hue = Math.random() * 360;
    this.pulse = Math.random() * Math.PI * 2;
  }

  update(mouse, canvas) {
    this.x += this.vx;
    this.y += this.vy;
    this.life -= this.decay;
    this.pulse += 0.08;

    // Boundary check with bounce
    if (this.x < 0 || this.x > canvas.width) this.vx *= -0.7;
    if (this.y < 0 || this.y > canvas.height) this.vy *= -0.7;

    // Weak attraction to mouse
    const dx = mouse.x - this.x;
    const dy = mouse.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < 100 && distance > 0) {
      const force = 0.00002;
      this.vx += (dx / distance) * force;
      this.vy += (dy / distance) * force;
    }

    // Apply drag
    this.vx *= 0.99;
    this.vy *= 0.99;
  }

  isOffscreen(canvas) {
    const margin = 50;
    return this.x < -margin || this.x > canvas.width + margin ||
           this.y < -margin || this.y > canvas.height + margin;
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = this.life;

    const pulseFactor = Math.sin(this.pulse) * 0.3 + 0.7;
    const radius = this.size * pulseFactor;

    // Simplified gradient
    const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, radius);
    gradient.addColorStop(0, `hsla(${this.hue}, 100%, 70%, 0.8)`);
    gradient.addColorStop(1, `hsla(${this.hue}, 100%, 50%, 0)`);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

class SiteManager {
  constructor() {
    this.optimizer = new PerformanceOptimizer();
    this.particleSystem = null;
    this.colorShiftId = null;
    this.ambientEffectId = null;
    this.morphingInterval = null;
    this.statsAnimated = false;
    
    this.init();
  }

  init() {
    this.initLoading();
    this.initScrollAnimations();
    this.initNavigation();
    this.initParticles();
    this.initCustomCursor();
    this.initScrollIndicator();
    this.initMorphingText();
    this.initStatsCounter();
    this.initTypingAnimations();
    this.initEnhancedInteractions();
    
    if (!this.optimizer.isLowPowerMode) {
      this.initColorShift();
      this.initAmbientEffects();
      this.initFloatingElements();
    }
    
    // Clean up on page unload
    window.addEventListener('beforeunload', () => this.cleanup());
  }

  initLoading() {
    window.addEventListener('load', () => {
      setTimeout(() => {
        const loading = document.getElementById('loading');
        if (loading) {
          loading.classList.add('fade-out');
          // Remove from DOM after animation
          setTimeout(() => loading.remove(), 1000);
        }
      }, 1500); // Reduced loading time
    });
  }

  initScrollAnimations() {
    const sections = document.querySelectorAll('section');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry, index) => {
          if (entry.isIntersecting && !entry.target.classList.contains('visible')) {
            setTimeout(() => {
              entry.target.classList.add('visible');
            }, index * 200); // Reduced delay
          }
        });
      },
      { 
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px' // Reduced margin
      }
    );
    
    sections.forEach(section => observer.observe(section));
  }

  initNavigation() {
    // Smooth scrolling with performance optimization
    const navLinks = document.querySelectorAll('nav a');
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const target = document.querySelector(link.getAttribute('href'));
        
        if (target) {
          // Create visual effect
          if (this.particleSystem && !this.optimizer.isLowPowerMode) {
            this.particleSystem.createParticles(
              window.innerWidth / 2, 
              window.innerHeight / 2, 
              8
            );
          }
          
          target.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }
      }, { passive: false });
    });
  }

  initParticles() {
    const canvas = document.getElementById('particle-canvas');
    if (canvas) {
      this.particleSystem = new ParticleSystem(canvas, this.optimizer);
    }
  }

  initColorShift() {
    let colorShift = 0;
    const updateColors = () => {
      colorShift += 0.5;
      document.documentElement.style.setProperty(
        '--accent', 
        `hsl(${260 + (colorShift % 60)}, 70%, 60%)`
      );
      document.documentElement.style.setProperty(
        '--neon', 
        `hsl(${180 + (colorShift % 60)}, 100%, 50%)`
      );
    };

    this.colorShiftId = setInterval(updateColors, 200); // Reduced frequency
  }

  initAmbientEffects() {
    const elements = document.querySelectorAll('h2, nav a, li');
    
    const addPulseEffect = () => {
      if (elements.length === 0) return;
      
      const randomElement = elements[Math.floor(Math.random() * elements.length)];
      randomElement.style.animation = 'pulse 0.4s ease-in-out';
      
      setTimeout(() => {
        randomElement.style.animation = '';
      }, 400);
    };

    this.ambientEffectId = setInterval(addPulseEffect, 4000); // Less frequent
  }

  initCustomCursor() {
    if (this.optimizer.isLowPowerMode) return;

    const cursor = document.querySelector('.cursor');
    const cursorDot = document.querySelector('.cursor-dot');
    
    if (!cursor || !cursorDot) return;

    let mouseX = 0, mouseY = 0;
    let cursorX = 0, cursorY = 0;
    let dotX = 0, dotY = 0;

    // Smooth cursor following
    const updateCursor = () => {
      const ease = 0.15;
      const dotEase = 0.8;

      cursorX += (mouseX - cursorX) * ease;
      cursorY += (mouseY - cursorY) * ease;
      dotX += (mouseX - dotX) * dotEase;
      dotY += (mouseY - dotY) * dotEase;

      cursor.style.transform = `translate(${cursorX - 10}px, ${cursorY - 10}px)`;
      cursorDot.style.transform = `translate(${dotX - 2}px, ${dotY - 2}px)`;

      requestAnimationFrame(updateCursor);
    };

    updateCursor();

    // Mouse move handler
    document.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    });

    // Hover effects
    const hoverElements = document.querySelectorAll('a, button, .nav-item, .list-item-enhanced, .stat-item');
    
    hoverElements.forEach(element => {
      element.addEventListener('mouseenter', () => {
        cursor.classList.add('hover');
      });
      
      element.addEventListener('mouseleave', () => {
        cursor.classList.remove('hover');
      });
      
      element.addEventListener('mousedown', () => {
        cursor.classList.add('click');
        setTimeout(() => cursor.classList.remove('click'), 150);
      });
    });
  }

  initScrollIndicator() {
    const scrollProgress = document.querySelector('.scroll-progress');
    if (!scrollProgress) return;

    const updateScrollProgress = () => {
      const scrollTop = window.pageYOffset;
      const docHeight = document.body.scrollHeight - window.innerHeight;
      const scrollPercent = (scrollTop / docHeight) * 100;
      
      scrollProgress.style.width = scrollPercent + '%';
    };

    window.addEventListener('scroll', this.optimizer.throttle(updateScrollProgress, 10), { passive: true });
  }

  initMorphingText() {
    const morphingText = document.querySelector('.morphing-text');
    if (!morphingText) return;

    const texts = morphingText.dataset.texts.split(',');
    let currentIndex = 0;

    const morphText = () => {
      morphingText.classList.add('morphing');
      
      setTimeout(() => {
        currentIndex = (currentIndex + 1) % texts.length;
        morphingText.textContent = texts[currentIndex];
      }, 400);
      
      setTimeout(() => {
        morphingText.classList.remove('morphing');
      }, 800);
    };

    // Start morphing after initial load
    this.morphingInterval = setInterval(morphText, 4000);
  }

  initStatsCounter() {
    const statItems = document.querySelectorAll('.stat-item');
    if (statItems.length === 0) return;

    const animateCounter = (element, target, duration = 2000) => {
      const numberElement = element.querySelector('.stat-number');
      const start = 0;
      const increment = target / (duration / 16);
      let current = start;

      const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
          current = target;
          clearInterval(timer);
        }
        numberElement.textContent = Math.floor(current);
      }, 16);
    };

    // Animate when stats come into view
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !this.statsAnimated) {
          this.statsAnimated = true;
          statItems.forEach((item, index) => {
            const target = parseInt(item.dataset.target);
            setTimeout(() => {
              animateCounter(item, target);
            }, index * 200);
          });
        }
      });
    }, { threshold: 0.5 });

    statItems.forEach(item => observer.observe(item));
  }

  initTypingAnimations() {
    const typingElements = document.querySelectorAll('.typing-animation');
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.animation = 'typing 2s steps(20) forwards, blink 1s infinite';
        }
      });
    }, { threshold: 0.8 });

    typingElements.forEach(element => observer.observe(element));
  }

  initEnhancedInteractions() {
    // Enhanced list item interactions
    const listItems = document.querySelectorAll('.list-item-enhanced');
    
    listItems.forEach(item => {
      item.addEventListener('click', () => {
        // Create ripple effect
        const ripple = document.createElement('div');
        ripple.style.cssText = `
          position: absolute;
          border-radius: 50%;
          background: rgba(0, 255, 255, 0.3);
          pointer-events: none;
          width: 0;
          height: 0;
          animation: ripple 0.6s ease-out;
        `;
        
        const rect = item.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = (rect.width / 2 - size / 2) + 'px';
        ripple.style.top = (rect.height / 2 - size / 2) + 'px';
        
        item.style.position = 'relative';
        item.appendChild(ripple);
        
        setTimeout(() => ripple.remove(), 600);
      });
    });

    // Enhanced navigation interactions
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      item.addEventListener('mouseenter', () => {
        if (this.particleSystem && !this.optimizer.isLowPowerMode) {
          const rect = item.getBoundingClientRect();
          this.particleSystem.createParticles(
            rect.left + rect.width / 2,
            rect.top + rect.height / 2,
            3
          );
        }
      });
    });
  }

  initFloatingElements() {
    const floatingElements = document.querySelectorAll('.float-element');
    
    floatingElements.forEach((element, index) => {
      const speed = parseFloat(element.dataset.speed) || 1;
      
      // Add random starting position
      const randomX = Math.random() * 100;
      const randomY = Math.random() * 100;
      
      element.style.left = randomX + '%';
      element.style.top = randomY + '%';
      
      // Add random color from palette
      const colors = ['var(--neon)', 'var(--pink)', 'var(--accent)', 'var(--gold)'];
      element.style.color = colors[index % colors.length];
    });
  }

  cleanup() {
    if (this.particleSystem) {
      this.particleSystem.stop();
    }
    if (this.colorShiftId) {
      clearInterval(this.colorShiftId);
    }
    if (this.ambientEffectId) {
      clearInterval(this.ambientEffectId);
    }
    if (this.morphingInterval) {
      clearInterval(this.morphingInterval);
    }
    if (this.optimizer.rafId) {
      cancelAnimationFrame(this.optimizer.rafId);
    }
  }
}

// Pulse animation for ambient effects
const style = document.createElement('style');
style.textContent = `
  @keyframes pulse {
    0% { transform: scale(1); filter: brightness(1); }
    50% { transform: scale(1.03); filter: brightness(1.1); }
    100% { transform: scale(1); filter: brightness(1); }
  }
`;
document.head.appendChild(style);

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new SiteManager());
} else {
  new SiteManager();
}