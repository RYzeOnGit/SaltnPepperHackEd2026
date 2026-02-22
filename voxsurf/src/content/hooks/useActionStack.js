import { useState, useRef, useCallback } from 'react';

export function useActionStack() {
  const [stack, setStack] = useState([]);
  const maxSizeRef = useRef(50);

  const push = useCallback((action) => {
    setStack((prev) => {
      const newStack = [...prev, action];
      if (newStack.length > maxSizeRef.current) {
        return newStack.slice(-maxSizeRef.current);
      }
      return newStack;
    });
  }, []);

  const pop = useCallback(() => {
    setStack((prev) => {
      if (prev.length === 0) return prev;
      return prev.slice(0, -1);
    });
  }, []);

  const undo = useCallback(() => {
    if (stack.length === 0) return null;
    const lastAction = stack[stack.length - 1];
    pop();
    return lastAction;
  }, [stack, pop]);

  const clear = useCallback(() => {
    setStack([]);
  }, []);

  return {
    stack,
    push,
    pop,
    undo,
    clear,
  };
}
