// Vitest stub for the `server-only` package. In a real Next.js build, Next's
// bundler swaps this import for a no-op on the server and a hard error on
// the client — there's no such bundler magic under plain Vite/Node, and the
// package's real implementation throws unconditionally outside that bundler
// context. Since every module that imports "server-only" in this codebase is
// exercised here strictly as server-side logic under Node, aliasing it to an
// empty module is the correct test-time equivalent of what Next does anyway.
export {};
