# Swiftline - Secure Escrow Payment Platform

## Overview
Swiftline is a secure escrow payment platform built with React/Vite for the frontend and has a separate Express.js backend component.

## Project Structure
- `/src` - Frontend React application (Vite + TypeScript + Tailwind CSS)
- `/backend` - Express.js backend server (separate package)
- `/supabase` - Supabase configuration

## Tech Stack
### Frontend
- React 18 with TypeScript
- Vite as build tool
- Tailwind CSS for styling
- Radix UI components
- React Router for navigation
- Supabase for authentication/database
- Paystack for payments
- Socket.io-client for real-time features

### Backend (not deployed on Replit)
- Express.js with TypeScript
- Prisma ORM
- Redis for caching
- Socket.io for real-time
- JWT authentication

## Development
- Frontend runs on port 5000
- Run with `npm run dev`

## Deployment
- Static deployment with Vite build output in `dist/` directory
