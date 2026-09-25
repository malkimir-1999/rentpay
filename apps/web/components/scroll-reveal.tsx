'use client';

import { useEffect } from 'react';

export function ScrollReveal() {
  useEffect(() => {
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const elements = Array.from(document.querySelectorAll<HTMLElement>('main > section:not(:first-of-type), main [data-rp-reveal]'));
    for (const element of elements) {
      element.dataset.rpReveal = '';
      if (element.parentElement?.tagName === 'MAIN') element.classList.add('rp-section-reveal');
    }
    document.documentElement.classList.add('rp-motion-ready');

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('rp-visible');
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.08, rootMargin: '0px 0px -48px 0px' });
    for (const element of elements) observer.observe(element);

    return () => {
      observer.disconnect();
      document.documentElement.classList.remove('rp-motion-ready');
      for (const element of elements) {
        element.classList.remove('rp-visible', 'rp-section-reveal');
        delete element.dataset.rpReveal;
      }
    };
  }, []);

  return null;
}
