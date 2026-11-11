// Entry point for the vendored simulation engine. See tools/build-sim.sh.
// Only the pure engine is taken from Breakscale: no React, no DOM, no I/O.
import { Engine } from '@breakscale/sim/engine';
import { defaultConfig } from '@breakscale/sim/presets';

(globalThis as unknown as { BreakscaleSim: unknown }).BreakscaleSim = { Engine, defaultConfig };
