/*jslint regexp: true */

module.exports = function (grunt) {
    'use strict';

    var path = require('path'),
        Handlebars = require('handlebars'),
        n2a = require('native2ascii').native2ascii;

    grunt.registerMultiTask('nerve-handlebars', 'translate templates to handlebars', function () {
        var options = this.options();

        function buildPartials(source, fileName) {
            var dir = path.dirname(fileName),
                includes = source.match(/\{\{>(.*)\}\}/g);

            if (includes) {
                includes.forEach(function (item) {
                    var relativeFileName = item.replace(/\{|\}|>/g, ''),
                        fullIncludeFileName,
                        ext = path.extname(relativeFileName),
                        isPathPrefixFound = false;

                    if (ext !== '.html') {
                        relativeFileName += '.hbs';
                    }

                    Object.keys(options.paths).forEach(function (pathId) {
                        if (relativeFileName.indexOf('@' + pathId) !== -1) {
                            fullIncludeFileName = path.resolve(options.paths[pathId], relativeFileName.replace('@' + pathId + '/', ''));
                            isPathPrefixFound = true;
                        }
                    });

                    if (!isPathPrefixFound) {
                        fullIncludeFileName = path.resolve(dir, relativeFileName);
                    }

                    if (!grunt.file.exists(fullIncludeFileName)) {
                        grunt.fail.fatal('no such file or directory: ' + fullIncludeFileName + '\nin file ' + fileName);
                    } else {
                        source = source.replace(item, buildPartials(grunt.file.read(fullIncludeFileName), fullIncludeFileName));
                    }
                });
            }

            return source;
        }

        this.filesSrc.forEach(function (file) {
            var filePath = path.resolve(this.data.cwd, file),
                moduleName = file.split('/')[0],
                relativeFileName = file.replace(moduleName + '/tmpl/', ''),
                dstPath = path.resolve(options.dst, moduleName, options.tmplDir || '', relativeFileName.replace(/(\.html)|(\.hbs)/, '.js')),
                tmplSource = grunt.file.read(filePath, {encoding: 'utf-8'}),
                handleBarsJs,
                precompile;

            tmplSource = buildPartials(tmplSource, filePath);
            try {
                precompile = Handlebars.precompile(tmplSource);
            } catch (err) {
                console.log(err);
                grunt.fail.fatal('cannot compile ' + file);
            }

            if (options.isCommonJs) {
                handleBarsJs = ' ' +
                    'Handlebars = require(process.cwd() + \'/src/app\').Handlebars;' +
                    'module.exports = Handlebars.template(' + precompile + ');';
            } else {
                handleBarsJs = ' ' +
                    'define([' +
                    '   \'handlebars\',' +
                    '   \'' + options.helpersPath + '\'' +
                    '], function (Handlebars, helpers) {' +
                    '       helpers(Handlebars);' +
                    '       return Handlebars.template(' + precompile + ');' +
                    '});';
            }

            grunt.file.mkdir(path.dirname(dstPath));
            grunt.file.write(dstPath, n2a(handleBarsJs));
            grunt.log.ok(dstPath);
        }.bind(this));
    });
};