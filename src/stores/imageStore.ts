// src/stores/imageStore.ts
import { writable } from 'svelte/store';

export const imageStore = writable<string | null>(null);
