import svelte from 'rollup-plugin-svelte';
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import compiler from '@ampproject/rollup-plugin-closure-compiler';
// import buble from 'rollup-plugin-buble';
// import uglify from 'rollup-plugin-uglify';

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
		input: "src/detail.js",
		output: {
			file: production ? 'public/_generated/detail.min.js' : 'public/_generated/detail.js',
			format: 'iife',
			sourcemap: true,
		},
		context: "window",
		plugins: [
			svelte({
				dev: !production,
				extensions: [".html", ".svelte", ".svg"],
				css: css => {
					css.write('public/_generated/detail.css');
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
			svelte({
				dev: !production,
				extensions: [".html", ".svelte", ".svg"]
			}),
			resolve(),
			commonjs()
		]
	}
];
