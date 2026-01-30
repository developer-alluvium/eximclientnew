
import weaviate from 'weaviate-ts-client';

const client = weaviate.client({
    scheme: process.env.WEAVIATE_SCHEME || 'http',
    host: process.env.WEAVIATE_HOST || 'localhost:8080',
    // apiKey: new weaviate.ApiKey(process.env.WEAVIATE_API_KEY), // Optional if auth enabled
});

export default client;
