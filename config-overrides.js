const path = require('path');

module.exports = {
    paths: function (paths, env) {
        paths.appIndexJs = path.resolve(__dirname, 'reactjs-app/index.tsx');
        paths.appSrc = path.resolve(__dirname, 'reactjs-app');
        return paths;
    }
}