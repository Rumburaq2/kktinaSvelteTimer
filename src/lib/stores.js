import { writable } from 'svelte/store';
export const createStore = (initial = 0) => writable(initial);