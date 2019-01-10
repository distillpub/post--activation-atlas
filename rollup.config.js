import svelte from 'rollup-plugin-svelte';
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import compiler from '@ampproject/rollup-plugin-closure-compiler';
// import buble from 'rollup-plugin-buble';
// import uglify from 'rollup-plugin-uglify';
import json from "rollup-plugin-json";

const production = !process.env.ROLLUP_WATCH;

console.log(`Running in production: ${production}`);

// These go in plugins
// If we're building for production (npm run build
// instead of npm run dev), transpile and minify
// production && buble({ include: ['src/**', 'node_modules/svelte/shared.js'] }),
// production && uglify()

export default [
	{
		input: "src/main.js",
		output: {
			file: production ? 'public/_generated/main.min.js' : 'public/_generated/main.js',
			format: 'iife',
			sourcemap: true,
		},
		context: "window",
		plugins: [
			json(),
			svelte({
				dev: !production,
				extensions: [".html", ".svelte", ".svg"],
				css: css => {
					css.write('public/_generated/main.css');
				}
			}),
			resolve(),
			commonjs(),
			production && compiler()
		]
	},
	{
		input: "src/app.js",
		output: {
			file: production ? 'public/_generated/app.min.js' : 'public/_generated/app.js',
			format: 'iife',
			sourcemap: true,
		},
		context: "window",
		plugins: [
			json(),
			svelte({
				dev: !production,
				extensions: [".html", ".svelte", ".svg"],
				css: css => {
					css.write('public/_generated/app.css');
				}
			}),
			resolve(),
			commonjs(),
			production && compiler()
		]
	},
	{
		input: "src/renders.js",
		output: {
			file: 'public/_generated/renders.js',
			format: 'iife',
			sourcemap: true,
		},
		plugins: [
			json(),
			svelte({
				dev: !production,
				extensions: [".html", ".svelte", ".svg"]
			}),
			resolve(),
			commonjs()
		]
	}
];
