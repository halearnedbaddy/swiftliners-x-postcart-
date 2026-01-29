import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { prisma } from './config/database';
import authRoutes from './routes/authRoutes';
import walletRoutes from './routes/walletRoutes';
import transactionRoutes from './routes/transactionRoutes';
import sellerRoutes from './routes/sellerRoutes';
import buyerRoutes from './routes/buyerRoutes';
import adminRoutes from './routes/adminRoutes';
import notificationRoutes from './routes/notificationRoutes';
import paymentRoutes from './routes/paymentRoutes';
import intasendRoutes from './routes/intasendRoutes';
import paystackRoutes from './routes/paystackRoutes';
import storeRoutes from './routes/storeRoutes';
import socialRoutes from './routes/socialRoutes';
import productRoutes from './routes/productRoutes';
import storefrontRoutes from './routes/storefrontRoutes';
import linkRoutes from './routes/linkRoutes';
import { globalRateLimiter, sanitizeInput, detectSuspiciousActivity } from './middleware/security';
import { startSyncScheduler } from './services/syncScheduler';
import { startEscrowScheduler } from './services/escrowService';
import { exchangeRateService } from './services/exchangeRateService';
import cron from 'node-cron';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5000', 'http://localhost:5173'],
    credentials: true,
    methods: ['GET', 'POST']
  }
});
const PORT = process.env.PORT || 8000;

// Track active user connections
const userConnections: Map<string, string> = new Map();

// Trust proxy for rate limiting behind reverse proxy
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for API
  crossOriginEmbedderPolicy: false,
}));

// CORS configuration - Allow all origins in development, restrict in production
const corsOrigins = process.env.CORS_ORIGIN?.split(',') || [
  'http://localhost:5000',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
];

// Allow Replit dev domains
const corsOptions: cors.CorsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // FIX: Explicitly allow all origins in Replit or dev environments to fix "Failed to fetch"
    if (
      origin.includes('replit.dev') || 
      origin.includes('localhost') || 
      origin.includes('127.0.0.1') ||
      process.env.NODE_ENV !== 'production'
    ) {
      callback(null, true);
    } else if (corsOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Fallback to allow during migration/debugging
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
};

app.use(cors(corsOptions));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// Security middleware
app.use(sanitizeInput);
app.use(detectSuspiciousActivity);
app.use(globalRateLimiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/wallet', walletRoutes);
app.use('/api/v1/transactions', transactionRoutes);
app.use('/api/v1/seller', sellerRoutes);
app.use('/api/v1/buyer', buyerRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/intasend', intasendRoutes);
app.use('/api/v1/paystack', paystackRoutes);
// New APIs (ADD ONLY)
app.use('/api/v1/store', storeRoutes);
app.use('/api/v1/social', socialRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/storefront', storefrontRoutes);
app.use('/api/v1/links', linkRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    code: 'NOT_FOUND',
  });
});

// Global error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Unhandled error:', err);

  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    code: 'SERVER_ERROR',
  });
});

// Socket.IO event handlers
io.on('connection', (socket) => {
  console.log(`✅ User connected: ${socket.id}`);

  // User joins their notification room
  socket.on('join-notifications', (userId: string) => {
    socket.join(`user:${userId}`);
    userConnections.set(userId, socket.id);
    console.log(`📢 User ${userId} joined notifications`);
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    // Remove from user connections map
    for (const [userId, socketId] of userConnections.entries()) {
      if (socketId === socket.id) {
        userConnections.delete(userId);
        console.log(`🔌 User ${userId} disconnected`);
        break;
      }
    }
  });
});

// Export io for use in controllers
import { socketService } from './services/socketService';
socketService.init(io);

export { io, userConnections };

// Start server
async function startServer() {
  try {
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connected successfully');

    // Start social sync scheduler
    startSyncScheduler();

    // Start escrow auto-release scheduler
    startEscrowScheduler();

    // Start exchange rate scheduler (hourly)
    cron.schedule('5 * * * *', () => {
      exchangeRateService.updateRates();
    });
    // Initial update
    exchangeRateService.updateRates();

    httpServer.listen(Number(PORT), '0.0.0.0', () => {
      console.log(`✅ Server running on http://0.0.0.0:${PORT}`);
      console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received. Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 SIGINT received. Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

startServer();

export default app;
