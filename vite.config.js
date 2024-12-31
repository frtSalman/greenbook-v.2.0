import { defineConfig } from 'vite';
import { resolve } from 'path';
import { readdirSync } from 'fs';

const jsFiles = readdirSync(resolve(__dirname, 'public/js'))
    .filter(file => file.endsWith('.js'))
    .reduce((entries, file) => {
        const name = file.replace('.js', ''); // Remove .js extension
        entries[name] = resolve(__dirname, `public/js/${file}`);
        return entries;
    }, {});

export default defineConfig({
    build: {
        rollupOptions: {
            input: jsFiles, // Dynamically include all JS files in public/js
            output: {
                entryFileNames: '[name].bundle.js', // Output file names
            },
        },
        outDir: 'dist', // Set output directory to the project root 'dist'
        emptyOutDir: true, // Clean the output directory before building
    },
});
