/**
 * LazyImage Component
 * Lazy loads images using Intersection Observer for better performance
 */

import { useState, useEffect, useRef } from 'react';

interface LazyImageProps {
  src: string;
  alt: string;
  placeholder?: string;
  className?: string;
  width?: number | string;
  height?: number | string;
  onLoad?: () => void;
  onError?: () => void;
  threshold?: number;
  rootMargin?: string;
}

export function LazyImage({
  src,
  alt,
  placeholder = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Crect width="400" height="300" fill="%231a1a1a"/%3E%3C/svg%3E',
  className = '',
  width,
  height,
  onLoad,
  onError,
  threshold = 0.01,
  rootMargin = '75px',
}: LazyImageProps) {
  const [imageSrc, setImageSrc] = useState(placeholder);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imageRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!imageRef.current) return;

    // Check if IntersectionObserver is supported
    if (!('IntersectionObserver' in window)) {
      // Fallback: load image immediately
      setImageSrc(src);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setImageSrc(src);
            observer.disconnect();
          }
        });
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(imageRef.current);

    return () => {
      observer.disconnect();
    };
  }, [src, threshold, rootMargin]);

  const handleLoad = () => {
    setIsLoaded(true);
    setHasError(false);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    setIsLoaded(false);
    onError?.();
  };

  return (
    <img
      ref={imageRef}
      src={imageSrc}
      alt={alt}
      width={width}
      height={height}
      onLoad={handleLoad}
      onError={handleError}
      className={`
        ${className} 
        transition-all duration-300
        ${!isLoaded && imageSrc === placeholder ? 'blur-sm scale-105' : 'blur-0 scale-100'}
        ${hasError ? 'opacity-50' : 'opacity-100'}
      `}
      loading="lazy"
      decoding="async"
    />
  );
}

// Utility component for background images
interface LazyBackgroundImageProps {
  src: string;
  placeholder?: string;
  className?: string;
  children?: React.ReactNode;
  threshold?: number;
  rootMargin?: string;
}

export function LazyBackgroundImage({
  src,
  placeholder,
  className = '',
  children,
  threshold = 0.01,
  rootMargin = '75px',
}: LazyBackgroundImageProps) {
  const [backgroundImage, setBackgroundImage] = useState(
    placeholder ? `url(${placeholder})` : 'none'
  );
  const [isLoaded, setIsLoaded] = useState(false);
  const divRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!divRef.current) return;

    if (!('IntersectionObserver' in window)) {
      // Fallback: load image immediately
      const img = new Image();
      img.onload = () => {
        setBackgroundImage(`url(${src})`);
        setIsLoaded(true);
      };
      img.src = src;
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Preload the image
            const img = new Image();
            img.onload = () => {
              setBackgroundImage(`url(${src})`);
              setIsLoaded(true);
            };
            img.src = src;
            observer.disconnect();
          }
        });
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(divRef.current);

    return () => {
      observer.disconnect();
    };
  }, [src, threshold, rootMargin]);

  return (
    <div
      ref={divRef}
      className={`
        ${className} 
        transition-all duration-300
        ${!isLoaded ? 'blur-sm' : 'blur-0'}
      `}
      style={{
        backgroundImage,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {children}
    </div>
  );
}

// Progressive Image Component (shows low-res then high-res)
interface ProgressiveImageProps {
  lowResSrc: string;
  highResSrc: string;
  alt: string;
  className?: string;
  width?: number | string;
  height?: number | string;
}

export function ProgressiveImage({
  lowResSrc,
  highResSrc,
  alt,
  className = '',
  width,
  height,
}: ProgressiveImageProps) {
  const [currentSrc, setCurrentSrc] = useState(lowResSrc);
  const [isHighResLoaded, setIsHighResLoaded] = useState(false);

  useEffect(() => {
    // Start loading high-res image
    const img = new Image();
    img.onload = () => {
      setCurrentSrc(highResSrc);
      setIsHighResLoaded(true);
    };
    img.src = highResSrc;
  }, [highResSrc]);

  return (
    <img
      src={currentSrc}
      alt={alt}
      width={width}
      height={height}
      className={`
        ${className} 
        transition-all duration-500
        ${isHighResLoaded ? 'blur-0' : 'blur-sm'}
      `}
      loading="lazy"
      decoding="async"
    />
  );
}

export default LazyImage;

