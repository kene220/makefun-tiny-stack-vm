// Tiny stack VM for make.fun tiny-stack-vm-01: faithful compact interpreter of the kit ISA,
// matching generator/subject/vm.mjs exactly. Deterministic: step-count budgets only.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const F = [(a, b) => a + b | 0, (a, b) => a - b | 0, Math.imul,
 (a, b) => a === -2147483648 && b === -1 ? a : (a / b) | 0, (a, b) => b === -1 ? 0 : a % b | 0,
 (a, b) => Math.floor((a >>> 0) / (b >>> 0)) | 0, (a, b) => (a >>> 0) % (b >>> 0) | 0, ,
 (a, b) => a & b, (a, b) => a | b, (a, b) => a ^ b, ,
 (a, b) => a << (b & 31), (a, b) => a >> (b & 31), (a, b) => (a >>> (b & 31)) | 0, ,
 (a, b) => a === b ? 1 : 0, (a, b) => a < b ? 1 : 0, (a, b) => (a >>> 0) < (b >>> 0) ? 1 : 0];
function run(p, inp) {
 const n = p.length;
 const D = new Int32Array(256), C = new Int32Array(64), M = new Int32Array(256), O = new Uint8Array(65536);
 let sp = 0, cs = 0, ol = 0, ip = 0, pc = 0, st = 0;
 const done = (c) => ({ o: O.subarray(0, ol), c });
 for (;;) {
  if (st === 1e6) return done(10);
  if (pc < 0 || pc >= n) return done(9);
  const at = pc, op = p[at];
  const im = op === 1 ? 1 : op === 2 ? 4 : op >= 48 && op <= 51 ? 2 : 0;
  if (at + im >= n) return done(9);
  st++; pc = at + 1 + im;
  switch (op) {
   case 0: return done(0);
   case 1: if (sp === 256) return done(3); D[sp++] = (p[at + 1] << 24) >> 24; break;
   case 2: if (sp === 256) return done(3); D[sp++] = p[at + 1] | (p[at + 2] << 8) | (p[at + 3] << 16) | (p[at + 4] << 24); break;
   case 3: if (sp < 1) return done(2); sp--; break;
   case 4: if (sp < 1) return done(2); if (sp === 256) return done(3); D[sp] = D[sp - 1]; sp++; break;
   case 5: { if (sp < 2) return done(2); const t = D[sp - 1]; D[sp - 1] = D[sp - 2]; D[sp - 2] = t; break; }
   case 6: if (sp < 2) return done(2); if (sp === 256) return done(3); D[sp] = D[sp - 2]; sp++; break;
   case 7: { if (sp < 3) return done(2); const a = D[sp - 3]; D[sp - 3] = D[sp - 2]; D[sp - 2] = D[sp - 1]; D[sp - 1] = a; break; }
   case 23: if (sp < 1) return done(2); D[sp - 1] = -D[sp - 1] | 0; break;
   case 27: if (sp < 1) return done(2); D[sp - 1] = ~D[sp - 1]; break;
   case 16: case 17: case 18: case 19: case 20: case 21: case 22: case 24: case 25: case 26: case 28: case 29: case 30: case 32: case 33: case 34: {
    if (sp < 2) return done(2);
    const b = D[sp - 1];
    if (b === 0 && op >= 19 && op <= 22) return done(4);
    D[sp - 2] = F[op - 16](D[sp - 2], b); sp--; break;
   }
   case 48: case 49: case 50: {
    const rel = ((p[at + 1] | (p[at + 2] << 8)) << 16) >> 16;
    let take = op === 48;
    if (!take) { if (sp < 1) return done(2); const v = D[--sp]; take = op === 49 ? v === 0 : v !== 0; }
    if (take) pc += rel; break;
   }
   case 51: if (cs === 64) return done(7); C[cs++] = pc; pc = p[at + 1] | (p[at + 2] << 8); break;
   case 52: if (cs === 0) return done(8); pc = C[--cs]; break;
   case 64: { if (sp < 1) return done(2); const a = D[sp - 1]; if (a < 0 || a > 255) return done(6); D[sp - 1] = M[a]; break; }
   case 65: { if (sp < 2) return done(2); const a = D[sp - 1]; if (a < 0 || a > 255) return done(6); M[a] = D[sp - 2]; sp -= 2; break; }
   case 80: {
    if (sp < 1) return done(2);
    const s = String(D[sp - 1]);
    if (ol + s.length > 65536) return done(11);
    sp--; for (let i = 0; i < s.length; i++) O[ol++] = s.charCodeAt(i);
    break;
   }
   case 81: if (sp < 1) return done(2); if (ol === 65536) return done(11); O[ol++] = D[--sp] & 255; break;
   case 82: if (sp === 256) return done(3); D[sp++] = ip < inp.length ? inp[ip++] : -1; break;
   case 83: if (sp < 1) return done(2); return done(D[sp - 1] & 255);
   default: return done(5);
  }
 }
}
const I = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const O = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
for (const id of readdirSync(I).sort()) {
 const r = run(new Uint8Array(readFileSync(join(I, id, 'program.bin'))), new Uint8Array(readFileSync(join(I, id, 'input.bin'))));
 mkdirSync(join(O, id), { recursive: true });
 writeFileSync(join(O, id, 'stdout.bin'), r.o);
 writeFileSync(join(O, id, 'exit.txt'), `${r.c}\n`);
}
