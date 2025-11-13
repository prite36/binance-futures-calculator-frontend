import { useEffect } from 'react';

/**
 * Custom hook to disable mouse wheel scrolling on number inputs
 * This prevents accidental value changes when scrolling over focused number inputs
 */
export function useDisableNumberInputScroll() {
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement;
      
      // Check if the target is a number input and is focused
      if (target && 
          target.tagName === 'INPUT' && 
          (target as HTMLInputElement).type === 'number' && 
          document.activeElement === target) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      
      // Add wheel event listener to focused number inputs
      if (target && 
          target.tagName === 'INPUT' && 
          (target as HTMLInputElement).type === 'number') {
        target.addEventListener('wheel', handleWheel, { passive: false });
      }
    };

    const handleBlur = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      
      // Remove wheel event listener when number input loses focus
      if (target && 
          target.tagName === 'INPUT' && 
          (target as HTMLInputElement).type === 'number') {
        target.removeEventListener('wheel', handleWheel);
      }
    };

    // Add global event listeners with error handling
    try {
      document.addEventListener('wheel', handleWheel, { passive: false });
      document.addEventListener('focus', handleFocus, true);
      document.addEventListener('blur', handleBlur, true);
    } catch (error) {
      console.warn('Failed to add number input scroll prevention listeners:', error);
    }

    // Cleanup function
    return () => {
      try {
        document.removeEventListener('wheel', handleWheel);
        document.removeEventListener('focus', handleFocus, true);
        document.removeEventListener('blur', handleBlur, true);
      } catch (error) {
        console.warn('Failed to remove number input scroll prevention listeners:', error);
      }
    };
  }, []);
}