import { series, parallel, watch, src, dest } from 'gulp';
import pump from 'pump';
import fs from 'fs';
import order from 'ordered-read-streams';

// gulp plugins and utils
import livereload from 'gulp-livereload';
import postcss from 'gulp-postcss';
import concat from 'gulp-concat';
import uglify from 'gulp-uglify';
import beeper from 'beeper';
import zip from 'gulp-zip';

// postcss plugins
import easyimport from 'postcss-easy-import';
import autoprefixer from 'autoprefixer';
import cssnano from 'cssnano';

function serve(done) {
    livereload.listen();
    done();
}

function handleError(done) {
    return function (err) {
        if (err) {
            beeper();
        }
        return done(err);
    };
}

function hbs(done) {
    pump(
        [src(['*.hbs', 'partials/**/*.hbs']), livereload()],
        handleError(done)
    );
}

function css(done) {
    pump(
        [
            src('assets/css/screen.css', { sourcemaps: true }),
            postcss([easyimport, autoprefixer, cssnano]),
            dest('assets/built/', { sourcemaps: '.' }),
            livereload(),
        ],
        handleError(done)
    );
}

function getJsFiles(version) {
    const jsFiles = [
        src(`node_modules/@tryghost/shared-theme-assets/assets/js/${version}/lib/**/*.js`),
        src(`node_modules/@tryghost/shared-theme-assets/assets/js/${version}/main.js`),
    ];

    if (fs.existsSync(`assets/js/lib`)) {
        jsFiles.push(src(`assets/js/lib/*.js`));
    }

    jsFiles.push(src(`assets/js/main.js`));

    return jsFiles;
}

function js(done) {
    pump(
        [
            order(getJsFiles('v1'), { sourcemaps: true }),
            concat('main.min.js'),
            uglify(),
            dest('assets/built/', { sourcemaps: '.' }),
            livereload(),
        ],
        handleError(done)
    );
}

function zipper(done) {
    const filename = JSON.parse(fs.readFileSync('./package.json')).name + '.zip';

    pump(
        [
            src([
                '**',
                '!node_modules',
                '!node_modules/**',
                '!dist',
                '!dist/**',
                '!yarn-error.log',
            ]),
            zip(filename),
            dest('dist/'),
        ],
        handleError(done)
    );
}

const hbsWatcher = () => watch(['*.hbs', 'partials/**/*.hbs'], hbs);
const cssWatcher = () => watch('assets/css/**/*.css', css);
const jsWatcher = () => watch('assets/js/**/*.js', js);
const watcher = parallel(hbsWatcher, cssWatcher, jsWatcher);
const build = series(css, js);

export { build };
export const zipTask = series(build, zipper);
export { zipTask as zip };
export default series(build, serve, watcher);
