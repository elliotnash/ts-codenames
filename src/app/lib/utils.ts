import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { createContext, useContext } from 'react';

export type ExtractUnionStrict<T, U extends T> = Extract<T, U>;
export type ExcludeUnionStrict<T, U extends T> = Exclude<T, U>;

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function createContextFactory<ContextData>(options?: {
  defaultValue?: ContextData | null;
  errorMessage?: string;
}) {
  const opts = {
    defaultValue: null,
    errorMessage: 'useContext must be used within a Provider',
    ...options,
  };

  const context = createContext<ContextData | null>(opts.defaultValue);

  function useContextFactory(): ContextData {
    const contextValue = useContext(context);
    if (contextValue === null) {
      throw new Error(opts.errorMessage);
    }
    return contextValue;
  }

  return [context.Provider, useContextFactory] as const;
}

export function shuffleArray<T>(array: T[]) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j]!, array[i]!];
  }
  return array;
}
