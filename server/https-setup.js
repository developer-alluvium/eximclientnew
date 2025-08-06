// HTTPS server setup for development
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to create HTTPS server for development
export const createHttpsServer = (app, port = 9001) => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  if (isDevelopment) {
    try {
      // Try to load SSL certificates for development
      const sslOptions = {
        key: fs.readFileSync(path.join(__dirname, 'ssl', 'localhost.key')),
        cert: fs.readFileSync(path.join(__dirname, 'ssl', 'localhost.crt'))
      };
      
      // Create HTTPS server
      const httpsServer = https.createServer(sslOptions, app);
      
      httpsServer.listen(port, () => {
        console.log(`🔒 HTTPS Server running on https://localhost:${port}`);
        console.log(`🔒 API available at https://localhost:${port}/api`);
      });
      
      return httpsServer;
    } catch (error) {
      console.warn('⚠️  SSL certificates not found for development. Falling back to HTTP.');
      console.warn('⚠️  To enable HTTPS in development, generate SSL certificates:');
      console.warn('⚠️  npm run generate-ssl-dev');
      
      // Fallback to HTTP
      app.listen(port, () => {
        console.log(`🌐 HTTP Server running on http://localhost:${port}`);
        console.log(`🌐 API available at http://localhost:${port}/api`);
      });
    }
  } else {
    // Production: Use HTTP (Nginx will handle HTTPS termination)
    app.listen(port, () => {
      console.log(`🌐 Server running on port ${port}`);
      console.log(`🌐 Environment: ${process.env.NODE_ENV}`);
    });
  }
};

// Generate self-signed certificates for development
export const generateDevSSL = () => {
  const sslDir = path.join(__dirname, 'ssl');
  
  // Create ssl directory if it doesn't exist
  if (!fs.existsSync(sslDir)) {
    fs.mkdirSync(sslDir, { recursive: true });
  }
  
  console.log('🔐 Generating self-signed SSL certificates for development...');
  
  // This is a basic implementation - in practice, you'd use openssl or mkcert
  console.log('Please run the following commands to generate SSL certificates:');
  console.log('');
  console.log('# Install mkcert (recommended)');
  console.log('# Linux:');
  console.log('sudo apt install libnss3-tools');
  console.log('wget -O mkcert https://github.com/FiloSottile/mkcert/releases/download/v1.4.4/mkcert-v1.4.4-linux-amd64');
  console.log('chmod +x mkcert');
  console.log('sudo mv mkcert /usr/local/bin/');
  console.log('');
  console.log('# Generate certificates');
  console.log('mkcert -install');
  console.log(`mkcert -key-file ${path.join(sslDir, 'localhost.key')} -cert-file ${path.join(sslDir, 'localhost.crt')} localhost 127.0.0.1 ::1`);
  console.log('');
  console.log('# Or use openssl (alternative)');
  console.log(`openssl req -x509 -newkey rsa:4096 -keyout ${path.join(sslDir, 'localhost.key')} -out ${path.join(sslDir, 'localhost.crt')} -days 365 -nodes -subj "/C=IN/ST=State/L=City/O=Organization/OU=OrgUnit/CN=localhost"`);
};
