export type AiActionResult =
  | { readonly fileName: string; readonly ok: true }
  | { readonly message: string; readonly ok: false };
