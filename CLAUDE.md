# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands
- `deno task check` - Type check the module
- `deno task scan` - Run device scanning example
- `deno task grid-test` - Run grid test example
- `deno task test-import` - Test importing the module
- `deno task check-device` - Check device connection
- Run examples: `deno run --allow-net --unstable-net src/examples/<filename>.ts`

## Code Style
- Formatting: 2 spaces, 80 char width, semicolons, double quotes
- Types: TypeScript interfaces with explicit return types (Promise<void>)
- Imports: Group imports by component, separate type imports
- Exports: Use mod.ts as re-export point for all components
- Naming: camelCase for variables/methods, PascalCase for classes
- Functions: Async/await for device operations
- Documentation: JSDoc-style comments on classes and methods
- Error handling: Custom error messages with detailed context
- Component Pattern: Device base class with Grid/Arc extending it
- Event pattern: EventEmitter-based events with typed callbacks