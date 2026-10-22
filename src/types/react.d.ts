/**
 * Minimal React typings for the client half.
 *
 * The host serves React as a platform module and the bundle reaches it through
 * the module loader's `require`, so the plugin deliberately carries no `react`
 * dependency. This shim covers exactly the surface the plugin uses; it is not
 * a substitute for `@types/react` in a full application.
 */
declare module "react" {
  export interface RefObject<T> {
    current: T;
  }

  export function createElement(
    type: string | ((props: never) => unknown),
    props?: Record<string, unknown> | null,
    ...children: unknown[]
  ): unknown;

  export function useEffect(
    effect: () => void | (() => void),
    deps?: readonly unknown[],
  ): void;

  export function useRef<T>(initial: T): RefObject<T>;
}
