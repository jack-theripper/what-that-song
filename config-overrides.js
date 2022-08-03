const path = require('path');

module.exports = {
    paths: function (paths, env) {
        paths.appIndexJs = path.resolve(__dirname, 'reactjs-app/index.tsx');
        paths.appSrc = path.resolve(__dirname, 'reactjs-app');

        return paths;
    },
    jest: function (config, env) {
        config.roots = ['<rootDir>/reactjs-app'];
        config.testMatch = [
            '<rootDir>/reactjs-app/**/__tests__/**/*.{js,jsx,ts,tsx}',
            '<rootDir>/reactjs-app/**/*.{spec,test}.{js,jsx,ts,tsx}'
        ];

        return config;
    }
}