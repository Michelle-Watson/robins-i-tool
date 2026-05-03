// Re-export Zod validation schemas (runtime validators + inferred types)
export * from "./generated/api";

// Re-export raw TypeScript types under a namespace to avoid name collisions
// with the Zod schema exports above (both use the same schema names).
// Usage: import type { Types } from "@workspace/api-zod"; Types.Study
export * as Types from "./generated/types";
