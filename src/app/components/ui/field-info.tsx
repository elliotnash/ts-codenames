import type { DeepKeys, DeepValue, FieldApi, Validator } from '@tanstack/react-form';

export function FieldInfo<
  TParentData,
  TName extends DeepKeys<TParentData>,
  TFieldValidator extends Validator<DeepValue<TParentData, TName>, unknown> | undefined,
  TFormValidator extends Validator<TParentData, unknown> | undefined,
>({
  field,
  hasSubmitted,
}: {
  field: FieldApi<TParentData, TName, TFieldValidator, TFormValidator>;
  hasSubmitted: boolean;
}) {
  if (hasSubmitted && field.state.meta.isDirty && field.state.meta.errorMap.onChange) {
    return (
      <em className="text-sm font-medium leading-none text-destructive">
        {field.state.meta.errorMap.onChange}
      </em>
    );
  }
  return null;
}
