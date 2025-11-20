/**
 * Test utilities for rendering React components with providers
 */

import { type RenderOptions, render } from "@testing-library/react";
import type { ReactElement } from "react";

/**
 * Custom render function that wraps components with necessary providers
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">
) {
  return render(ui, { ...options });
}

/**
 * Re-export everything from React Testing Library
 */
export * from "@testing-library/react";
export { renderWithProviders as render };
