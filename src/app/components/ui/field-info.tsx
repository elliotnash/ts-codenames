import type { AnyFieldApi } from '@tanstack/react-form';

export function FieldInfo({ field, hasSubmitted }: { field: AnyFieldApi; hasSubmitted: boolean }) {
  const error = field.state.meta.errorMap.onChange;
  if (hasSubmitted && field.state.meta.isDirty && error) {
    // v1 zod validators return Standard Schema issue objects, not strings.
    const message = Array.isArray(error) ? error.map((e) => e.message).join(', ') : String(error);
    return (
      <em className="text-sm font-medium leading-none text-destructive">{message}</em>
    );
  }
  return null;
}
