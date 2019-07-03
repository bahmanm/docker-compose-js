'use strict';

const { spawn } = require('child_process');
const debug = require('debug')('docker-compose-js');

module.exports = function compose(composeFile, composeOptions = {}) {
  function objectToOptions(obj) {
    const result = [];
    Object.keys(obj).forEach(k => {
      if (k.length <= 2) {
        if (k.indexOf('-') === 0) {
          result.push(k);
        } else {
          result.push(`-${k}`);
        }
        if (obj[k])
          result.push(obj[k]);
      } else {
        const optName = (k.indexOf('--') === 0) ? k : `--${k}`;
        const optValue = obj[k] ? `=${obj[k]}` : '';
        const optStr = `${optName}${optValue}`;
        result.push(optStr);
      }
    });
    return result;
  }

  function run(command, options = {}, services, param1) {
    return new Promise(
      (function(resolve, reject) {
        let stdout = '';
        let stderr = '';
        const env = { ...process.env, ...options.envars, shell: true };
        delete options.envars;
        let args = [
          '-f', composeFile,
          ...objectToOptions(composeOptions),
          command,
          ...objectToOptions(options)
        ];
        if (services) {
          if (Array.isArray(services)) {
            args = args.concat(services);
          } else {
            args.push(services);
          }
        }

        // Some commands support an additional parameter
        if (param1) args.push(param1);
        debug('docker-compose', args);
        const cmd = spawn('docker-compose', args, { env });

        cmd.stdout.on('data', (data) => {
          debug('stdout', data.toString());
          stdout += data;
        });

        cmd.stderr.on('data', (data) => {
          debug('stderr', data.toString());
          stderr += data;
        });

        cmd.on('close', (code) => {
          debug('close with code', code);
          if (code !== 0) {
            reject(`Command exited: ${code}\n${stderr}`);
          } else {
            resolve(stdout);
          }
        });
      })
    );
  }

  return {
    up: (options = {}) => {
      options.d = '';
      return run('up', options);
    },
    down: options => run('down', options),
    ps: options => run('ps', options),
    start: (services, options) => run('start', options, services),
    stop: (services, options) => run('stop', options, services),
    restart: (services, options) => run('restart', options, services),
    kill: (services, options) => run('kill', options, services),
    pull: (services, options) => run('pull', options, services),
    create: (services, options) => run('create', options, services),
    version: options => run('version', options),
    pause: (services, options) => run('pause', options, services),
    unpause: (services, options) => run('unpause', options, services),
    scale: (services, options) => run('scale', options, services),
    rm: (services, options) => run('rm', options, services),
    // logs is going to require special handling since it attaches to containers
    // logs: (services, options) => { return run('logs', options, services); },
    port: (service, privatePort, options) => run('port', options, service, privatePort),
    run,
    /*
      Currently unimplemented
      events
    */
  };
};
