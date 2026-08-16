'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { tourSteps, TOUR_STORAGE_KEY, TourStep } from './tourConfig';
import {
  X,
  ChevronRight,
  ChevronLeft,
  Check,
  Sparkles,
  Command,
} from 'lucide-react';

interface VisualizerTourProps {
  isOpen?: boolean;
  onClose?: () => void;
  forceOpen?: boolean;
}

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export default function VisualizerTour({
  isOpen: controlledIsOpen,
  onClose: controlledOnClose,
  forceOpen = false,
}: VisualizerTourProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Initialize on mount: check localStorage for first-time onboarding
  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== 'undefined') {
      const completed = localStorage.getItem(TOUR_STORAGE_KEY);
      if (!completed || forceOpen) {
        // Small delay to allow canvas and DOM elements to mount
        const timer = setTimeout(() => {
          setIsOpen(true);
        }, 600);
        return () => clearTimeout(timer);
      }
    }
  }, [forceOpen]);

  // Sync with controlled isOpen prop if provided
  useEffect(() => {
    if (controlledIsOpen !== undefined) {
      setIsOpen(controlledIsOpen);
      if (controlledIsOpen) {
        setCurrentStepIndex(0);
      }
    }
  }, [controlledIsOpen]);

  // Listen for global custom event to restart tour from anywhere (e.g. header / help modal)
  useEffect(() => {
    const handleRestartTour = () => {
      setCurrentStepIndex(0);
      setIsOpen(true);
    };

    window.addEventListener('hod:restart-tour', handleRestartTour);
    return () => window.removeEventListener('hod:restart-tour', handleRestartTour);
  }, []);

  const currentStep: TourStep = tourSteps[currentStepIndex] || tourSteps[0];

  // Update target bounding box
  const updateTargetRect = useCallback(() => {
    if (!isOpen) return;
    const targetElement = document.querySelector(currentStep.targetSelector);
    if (targetElement) {
      const rect = targetElement.getBoundingClientRect();
      setTargetRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });

      // Scroll into view if out of viewport
      const isInViewport =
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth);

      if (!isInViewport) {
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    } else {
      setTargetRect(null);
    }
  }, [isOpen, currentStep]);

  // Reposition on step change, window resize, or scroll
  useEffect(() => {
    updateTargetRect();
    const handleResize = () => updateTargetRect();
    const handleScroll = () => updateTargetRect();

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [updateTargetRect, currentStepIndex]);

  const markTourCompleted = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(TOUR_STORAGE_KEY, 'true');
    }
  };

  const handleClose = useCallback(() => {
    markTourCompleted();
    setIsOpen(false);
    if (controlledOnClose) {
      controlledOnClose();
    }
  }, [controlledOnClose]);

  const handleNext = useCallback(() => {
    if (currentStepIndex < tourSteps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      handleClose();
    }
  }, [currentStepIndex, handleClose]);

  const handleBack = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  }, [currentStepIndex]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft' && currentStepIndex > 0) {
        e.preventDefault();
        handleBack();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStepIndex, handleClose, handleNext, handleBack]);

  if (!isMounted || !isOpen) return null;

  const isLastStep = currentStepIndex === tourSteps.length - 1;
  const padding = 8;

  // Calculate Tooltip Coordinates
  const computeTooltipStyle = (): React.CSSProperties => {
    if (!targetRect) {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        position: 'fixed',
      };
    }

    const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 1024;
    const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 768;
    const isMobile = windowWidth < 768;
    const tooltipWidth = isMobile ? Math.min(340, windowWidth - 32) : 340;
    const tooltipHeight = 220; // Estimated height for placement calculations

    const placement = currentStep.placement || 'auto';

    let top = 0;
    let left = 0;

    if (isMobile) {
      // On mobile devices, dock tooltip comfortably at bottom or top of viewport
      const hasSpaceAtBottom = windowHeight - (targetRect.top + targetRect.height) > 230;
      if (hasSpaceAtBottom) {
        top = targetRect.top + targetRect.height + 12;
      } else if (targetRect.top > 230) {
        top = targetRect.top - tooltipHeight - 12;
      } else {
        top = windowHeight - tooltipHeight - 16;
      }
      left = (windowWidth - tooltipWidth) / 2;
    } else if (placement === 'right') {
      left = targetRect.left + targetRect.width + 16;
      top = targetRect.top + targetRect.height / 2 - 80;

      // Flip to left if clipping right
      if (left + tooltipWidth > windowWidth - 16) {
        left = targetRect.left - tooltipWidth - 16;
      }
    } else if (placement === 'left') {
      left = targetRect.left - tooltipWidth - 16;
      top = targetRect.top + targetRect.height / 2 - 80;

      // Flip to right if clipping left
      if (left < 16) {
        left = targetRect.left + targetRect.width + 16;
      }
    } else if (placement === 'top') {
      top = targetRect.top - tooltipHeight - 16;
      left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;

      // Flip to bottom if clipping top
      if (top < 16) {
        top = targetRect.top + targetRect.height + 16;
      }
    } else {
      // Bottom / Default
      top = targetRect.top + targetRect.height + 16;
      left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;

      // Flip to top if clipping bottom
      if (top + tooltipHeight > windowHeight - 16) {
        top = targetRect.top - tooltipHeight - 16;
      }
    }

    // Clamp coordinates within viewport
    const clampedLeft = Math.max(16, Math.min(windowWidth - tooltipWidth - 16, left));
    const clampedTop = Math.max(16, Math.min(windowHeight - tooltipHeight - 16, top));

    return {
      top: `${clampedTop}px`,
      left: `${clampedLeft}px`,
      width: `${tooltipWidth}px`,
      position: 'fixed',
    };
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-step-title"
      className="fixed inset-0 z-50 overflow-hidden select-none pointer-events-auto animate-in fade-in duration-200"
    >
      {/* SVG Spotlight Cutout Backdrop */}
      <svg
        className="absolute inset-0 h-full w-full pointer-events-none transition-all duration-300 ease-out"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <mask id="tour-spotlight-mask">
            {/* White base fills entire viewport (opaque mask) */}
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {/* Black cutout over target element (transparent hole) */}
            {targetRect && (
              <rect
                x={Math.max(0, targetRect.left - padding)}
                y={Math.max(0, targetRect.top - padding)}
                width={targetRect.width + padding * 2}
                height={targetRect.height + padding * 2}
                rx="8"
                ry="8"
                fill="black"
              />
            )}
          </mask>
        </defs>

        {/* Semi-transparent dark luxury backdrop using mask */}
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(26, 22, 19, 0.68)"
          mask="url(#tour-spotlight-mask)"
          className="backdrop-blur-[1.5px]"
        />
      </svg>

      {/* Pulsing Target Highlight Ring */}
      {targetRect && (
        <div
          style={{
            top: `${Math.max(0, targetRect.top - padding)}px`,
            left: `${Math.max(0, targetRect.left - padding)}px`,
            width: `${targetRect.width + padding * 2}px`,
            height: `${targetRect.height + padding * 2}px`,
          }}
          className="fixed pointer-events-none rounded-lg border-2 border-[var(--accent-gold)] ring-4 ring-[var(--accent-gold)]/20 shadow-2xl transition-all duration-300 ease-out"
        >
          <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[var(--accent-gold)] animate-ping" />
          <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[var(--accent-gold)]" />
        </div>
      )}

      {/* Floating Guided Tour Card */}
      <div
        ref={tooltipRef}
        style={computeTooltipStyle()}
        className="bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-secondary)] rounded-xl shadow-2xl p-4 transition-all duration-300 ease-out z-50 space-y-3.5"
      >
        {/* Header: Step Badge, Sparkle, and Close Button */}
        <div className="flex items-center justify-between pb-1 border-b border-[var(--border-secondary)]">
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-[var(--brand-earth)] text-[var(--bg-primary)] text-[10px] font-bold tracking-wider uppercase">
              <Sparkles className="w-2.5 h-2.5 text-[var(--accent-gold)]" />
              <span>Step {currentStepIndex + 1} of {tourSteps.length}</span>
            </span>
          </div>

          <button
            type="button"
            onClick={handleClose}
            aria-label="Close tutorial"
            className="p-1 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Step Title & Description */}
        <div className="space-y-1.5">
          <h3 id="tour-step-title" className="text-sm font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-1.5">
            {currentStep.title}
          </h3>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            {currentStep.description}
          </p>
        </div>

        {/* Optional Hotkey / Tip Badge */}
        {currentStep.shortcut && (
          <div className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md bg-[var(--bg-tertiary)]/70 border border-[var(--border-secondary)] text-[11px] text-[var(--text-primary)] font-medium">
            <Command className="w-3 h-3 text-[var(--accent-gold)] flex-shrink-0" />
            <span className="truncate">{currentStep.shortcut}</span>
          </div>
        )}

        {/* Footer: Progress Indicators and Action Buttons */}
        <div className="flex items-center justify-between pt-1">
          {/* Step Progress Dots */}
          <div className="flex items-center space-x-1">
            {tourSteps.map((step, idx) => (
              <div
                key={step.id}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === currentStepIndex
                    ? 'w-4 bg-[var(--accent-gold)]'
                    : idx < currentStepIndex
                    ? 'w-1.5 bg-[var(--brand-earth)]'
                    : 'w-1.5 bg-[var(--border-secondary)]'
                }`}
              />
            ))}
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center space-x-2">
            {!isLastStep && (
              <button
                type="button"
                onClick={handleClose}
                className="text-[11px] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors px-1.5 py-1"
              >
                Skip
              </button>
            )}

            {currentStepIndex > 0 && (
              <button
                type="button"
                onClick={handleBack}
                aria-label="Previous step"
                className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-md border border-[var(--border-secondary)] bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] text-xs font-medium text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className={`inline-flex items-center space-x-1 px-3 py-1.5 rounded-md text-xs font-semibold shadow-sm transition-all cursor-pointer ${
                isLastStep
                  ? 'bg-[var(--accent-gold)] text-[var(--brand-earth)] hover:bg-[var(--accent-gold-hover)]'
                  : 'bg-[var(--brand-earth)] text-[var(--bg-primary)] hover:bg-[var(--text-primary)]'
              }`}
            >
              <span>{isLastStep ? 'Got it' : 'Next'}</span>
              {isLastStep ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
