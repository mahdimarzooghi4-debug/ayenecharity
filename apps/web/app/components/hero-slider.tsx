"use client";

import Image from "next/image";
import { useState } from "react";

import type { PublicHeroSlide } from "../../lib/public-api";
import styles from "../home.module.css";

export function HeroSlider({ slides }: { slides: PublicHeroSlide[] }) {
  const safeSlides = slides.slice(0, 4);
  const [index, setIndex] = useState(0);

  if (safeSlides.length === 0) {
    return (
      <div className={styles.heroVisual} aria-label="مرکز نیکوکاری آینه">
        <div className={styles.heroFallback}>
          <div className={styles.heroFallbackFrame} />
          <span className={styles.heroFallbackAccent} />
          <img
            className={styles.heroFallbackLogo}
            src="/brand/logo.png"
            alt="نشان مرکز نیکوکاری آینه"
            width={64}
            height={64}
          />
        </div>
      </div>
    );
  }

  const activeIndex = Math.min(index, safeSlides.length - 1);
  const active = safeSlides[activeIndex]!;

  function previous() {
    setIndex((current) => (current - 1 + safeSlides.length) % safeSlides.length);
  }

  function next() {
    setIndex((current) => (current + 1) % safeSlides.length);
  }

  return (
    <div
      className={styles.heroVisual}
      role="region"
      aria-roledescription="carousel"
      aria-label="تصاویر فعالیت‌های نیکوکاری"
    >
      <Image
        className={styles.heroSlideImage}
        src={active.imageUrl}
        alt={active.title}
        fill
        priority
        sizes="(max-width: 820px) 220px, (max-width: 1100px) 50vw, 560px"
      />
      <span className={styles.heroVisualBadge}>فعالیت نیکوکاری</span>

      {safeSlides.length > 1 ? (
        <>
          <button
            className={styles.heroPrevious}
            type="button"
            onClick={previous}
            aria-label="اسلاید قبلی"
          >
            <img src="/brand/chevron-left.svg" alt="" width={20} height={20} />
          </button>
          <button
            className={styles.heroNext}
            type="button"
            onClick={next}
            aria-label="اسلاید بعدی"
          >
            <img src="/brand/chevron-right.svg" alt="" width={20} height={20} />
          </button>
          <div className={styles.heroIndicators} aria-label="موقعیت اسلاید">
            {safeSlides.map((slide, slideIndex) => (
              <button
                key={slide.id}
                type="button"
                className={
                  slideIndex === activeIndex
                    ? styles.heroIndicatorActive
                    : styles.heroIndicator
                }
                onClick={() => setIndex(slideIndex)}
                aria-label={"نمایش اسلاید " + String(slideIndex + 1)}
                aria-current={slideIndex === activeIndex ? "true" : undefined}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
