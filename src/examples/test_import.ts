/**
 * Test import to verify module loading works correctly
 */

import serialosc, { Grid, Arc } from "../mod.ts";

console.log("Successfully imported modules:");
console.log("- serialosc:", typeof serialosc);
console.log("- Grid:", typeof Grid);
console.log("- Arc:", typeof Arc);