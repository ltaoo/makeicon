import { createSignal } from "solid-js";

// export function useState<T extends { state: any; onChange: (v: any) => void }>(store: {
//   [Property in keyof T]: {
//     state: T[Property];
//     onChange: (v: T[Property]) => void;
//   };
// }) {
//   const [state, setState] = createSignal(store.state);
//   store.onChange((v) => setState(v));
//   return state;
// }

// export function useState<T extends { state: any; onChange: (v: any) => void }>(store: {
//   [Property in keyof T]: {
//     state: T[Property];
//     onChange: (v: T[Property]) => void;
//   };
// }) {
//   const [state, setState] = createSignal(store.state);
//   store.onChange((v) => setState(v));
//   return state;
// }
