import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import os from 'os';
import mongoose from 'mongoose';
import { connectDatabase } from './config/db';

// Import Route Controllers
import authRouter from './routes/auth';
import superAdminRouter from './routes/superadmin';
import gymOwnerRouter from './routes/gymowner';
import membersRouter from './routes/members';
import plansRouter from './routes/plans';
import paymentsRouter from './routes/payments';
import attendanceRouter from './routes/attendance';
import trainersRouter from './routes/trainers';
import dietsRouter from './routes/diets';
import workoutsRouter from './routes/workouts';
import notificationsRouter from './routes/notifications';
import publicRouter from './routes/public';

// Configure Environments
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// 1. IP Rate Limiting Configuration
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 200 requests per window
  message: { message: 'Too many requests from this IP address. Please try again after 15 minutes.' }
});

// 2. Global Security & Hardening Middleware
app.use(helmet());
app.use(compression());
app.use(cookieParser());
app.use(cors());
app.use(express.json());

// Morgan structured logging (JSON-like request telemetry in console)
app.use(morgan('combined'));

// Apply rate limiter to all write endpoints under api/
app.use('/api/', apiLimiter);

// 3. Mount API Routes
app.use('/api/auth', authRouter);
app.use('/api/superadmin', superAdminRouter);
app.use('/api/gymowner', gymOwnerRouter);
app.use('/api/members', membersRouter);
app.use('/api/plans', plansRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/attendance', attendanceRouter);
app.use('/api/trainers', trainersRouter);
app.use('/api/diets', dietsRouter);
app.use('/api/workouts', workoutsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/public', publicRouter);

// 4. OpenAPI / Swagger Specifications Endpoints
app.get('/api/swagger.json', (req, res) => {
  res.json({
    openapi: '3.0.0',
    info: {
      title: 'India Gym Management SaaS API Documentation',
      version: '1.0.0',
      description: 'API services powering multi-tenant gyms studio operations, CRM lead captures, check-ins scan simulator and billing collections.'
    },
    paths: {
      '/api/auth/login': {
        post: {
          summary: 'Unified authentication login portal',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    email: { type: 'string' },
                    password: { type: 'string' }
                  },
                  required: ['email', 'password']
                }
              }
            }
          },
          responses: {
            200: { description: 'Successful login returning JWT access token' }
          }
        }
      },
      '/api/superadmin/dashboard': {
        get: {
          summary: 'Super admin platform revenue metrics summary',
          responses: {
            200: { description: 'Revenues telemetry statistics' }
          }
        }
      },
      '/api/gymowner/dashboard': {
        get: {
          summary: 'Gym studio members analytics telemetry KPIs',
          responses: {
            200: { description: 'Members statuses counts and balance recovery metrics' }
          }
        }
      },
      '/api/attendance/check-in': {
        post: {
          summary: 'Mock check-in scan matching QR pass codes',
          responses: {
            200: { description: 'Access outcome feedback' }
          }
        }
      }
    }
  });
});

app.get('/api/docs', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>API Documentation Docs</title>
      <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
    </head>
    <body>
      <div id="swagger-ui"></div>
      <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
      <script>
        window.onload = () => {
          window.ui = SwaggerUIBundle({
            url: '/api/swagger.json',
            dom_id: '#swagger-ui',
          });
        };
      </script>
    </body>
    </html>
  `);
});

// 5. Health Monitoring Endpoints
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/api/health/db', (req, res) => {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  const dbStatus = mongoose.connection.readyState;
  res.json({
    status: dbStatus === 1 ? 'healthy' : 'unhealthy',
    state: states[dbStatus] || 'unknown',
    timestamp: new Date()
  });
});

app.get('/api/health/system', (req, res) => {
  res.json({
    status: 'healthy',
    platform: os.platform(),
    arch: os.arch(),
    uptime: os.uptime(),
    freeMemBytes: os.freemem(),
    totalMemBytes: os.totalmem(),
    cpuCores: os.cpus().length,
    timestamp: new Date()
  });
});

// Start Server
async function bootstrap() {
  await connectDatabase();
  app.listen(PORT, () => {
    console.log(`[SERVER RUNNING] hardened Express backend listening on port ${PORT}`);
  });
}

bootstrap();
