'use strict';

module.exports = function (grunt) {
    'use strict';

    var path = require('path'),
        Handlebars = require('handlebars'),
        n2a = require('native2ascii').native2ascii;

    grunt.registerMultiTask("nerve-handlebars", "translate handlebars templates to js", function () {
        function buildPartials(source, fileName) {
            var dir = path.dirname(fileName),
                includes = source.match(/\{\{>(.*)\}\}/g);

            if (includes) {
                includes.forEach(function (item) {
                    var relativeFileName = item.replace(/\{|\}|>/g, '') + '.hbs';

                    fileName = path.resolve(dir, relativeFileName);
                    source = source.replace(item, buildPartials(grunt.file.read(fileName), fileName));
                });
            }
            return source;
        }

        this.filesSrc.forEach(function (file) {
            var cwd = this.data.cwd || '',
                dst = this.data.dst || '',
                filePath = path.resolve(cwd || '', file),
                moduleName = file.split('/')[0],
                relativeFileName = file.replace(moduleName + '/tmpl/', ''),
                dstPath = path.resolve(path.resolve(dst, moduleName, 'tmpl', relativeFileName.replace(/(\.html)|(\.hbs)/, '.js'))),
                tmplSource = grunt.file.read(filePath, {encoding: 'utf-8'}),
                handleBarsJs;

            tmplSource = buildPartials(tmplSource, filePath);
            handleBarsJs = "define(['handlebars', 'handlebars-helpers'], function (Handlebars, helpers) { helpers(Handlebars); return Handlebars.template(" + Handlebars.precompile(tmplSource) + "); });";

            grunt.file.mkdir(path.dirname(dstPath));
            grunt.file.write(dstPath, n2a(handleBarsJs));
            grunt.log.ok(dstPath);
        }.bind(this));
    });
};