
import { makeApp } from './app.js';
import { config } from './src/config/index.js';

// makeApp() already registers RSA encryption
const app = makeApp();

async function startServer() {
    try {
        await app.listen({
            port: config.port,
            host: config.host,
        });

        console.log(
            `AuthLab running at http://${config.host}:${config.port}`
        );

        console.log('RSA encryption enabled successfully');
    } catch (error) {
        app.log.error(error);
        process.exit(1);
    }
}

startServer();
