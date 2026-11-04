
import { makeApp } from './app.js';
import { config } from './src/config/index.js';
import { setupPayloadEncryption } from './src/lib/payload-crypto.js';

const app = makeApp();

// Register RSA encryption and decryption
setupPayloadEncryption(app);

async function startServer() {
    try {
        await app.listen({
            port: config.port,
            host: config.host,
        });

        console.log(
            `AuthLab running at http://${config.host}:${config.port}`
        );

        console.log('RSA payload encryption enabled');
    } catch (error) {
        app.log.error(error);
        process.exit(1);
    }
}

startServer();
