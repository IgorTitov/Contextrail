/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose TypeScript type definitions for the form-validation module.
 * @sidecar types.d.ts.header.md
 * @layer module | @hex _none_ | @ctx form-validation
 * @public false
 * @edit careful
 */

/**
 * Core type definitions for the form-validation module.
 *
 * SpecRefs: TPL-146, TPL-147
 */

export interface ValidationResult {
  valid: boolean;
  errorKey?: string;
  params?: Record<string, any>;
}

export type ValidationRule = (value: any, allValues?: Record<string, any>) => ValidationResult;

export interface FormValidationResult {
  valid: boolean;
  errors: Record<string, ValidationResult>;
}

export function required(): ValidationRule;
export function minLength(min: number): ValidationRule;
export function maxLength(max: number): ValidationRule;
export function pattern(regex: RegExp, errorKey?: string): ValidationRule;
export function email(): ValidationRule;
export function matches(fieldName: string): ValidationRule;
export function custom(fn: (value: any, allValues?: Record<string, any>) => boolean, errorKey: string): ValidationRule;

export function combineRules(...rules: ValidationRule[]): ValidationRule;
export function validateField(value: any, rules: ValidationRule[], allValues?: Record<string, any>): ValidationResult;
export function validateForm(formValues: Record<string, any>, fieldRules: Record<string, ValidationRule[]>): FormValidationResult;
export function isFormValid(result: FormValidationResult): boolean;
