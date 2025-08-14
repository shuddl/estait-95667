
import cors from 'cors';

const allowedOrigins = [
    'http://localhost:3000',
    `https://${process.env.GCLOUD_PROJECT}.firebaseapp.com`,
    `https://${process.env.GCLOUD_PROJECT}.web.app`,
];

const corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
};

export const corsMiddleware = cors(corsOptions);
