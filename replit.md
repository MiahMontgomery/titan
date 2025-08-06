# TITAN - Autonomous AI Project Builder

## Overview

TITAN is an autonomous AI project management system that creates and manages isolated execution environments for AI-driven projects and personas. The system combines a React frontend with an Express/Node.js backend, featuring real-time WebSocket communication, secure secrets management, and browser automation capabilities. Each project operates independently with its own memory, secrets, and AI agents that can execute tasks autonomously, including web interactions through Puppeteer and voice synthesis through ElevenLabs.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The frontend is built as a single-page application (SPA) using React with TypeScript, featuring a dark-themed dashboard interface. The architecture follows a component-based design with:
- **Context-based state management** using React Context API for project and input synchronization
- **Real-time updates** via WebSocket connections for live project status and messaging
- **Tab-based navigation** within expanded projects (Progress, Input, Logs, Output, Sales tabs)
- **Animation system** using Framer Motion for smooth UI transitions
- **Responsive design** with Tailwind CSS and Radix UI components

### Backend Architecture
The backend uses Express.js with TypeScript in an ES module architecture:
- **Autonomous execution loop** with task queue management and periodic execution cycles
- **Modular core system** with separate modules for brain (task execution), memory, secrets, logging, and WebSocket management
- **Agent isolation** where each project and persona operates in its own sandboxed environment
- **File-based storage** for logs, memory states, and task queues with JSON persistence
- **API layer** providing RESTful endpoints for project management and data access

### Database and Storage
The system uses a hybrid storage approach:
- **PostgreSQL** as the primary relational database using Drizzle ORM for structured data (projects, features, milestones, goals, messages, logs, outputs, sales)
- **File-based JSON storage** for agent memory states, task queues, and execution logs
- **Encrypted secrets storage** using Node.js crypto for sensitive data per project/persona
- **File output management** for screenshots, audio files, and generated content

### AI Integration and Automation
- **OpenRouter API integration** for accessing multiple AI models (Claude 3 Opus for high-level reasoning, GPT-4 Turbo for code generation)
- **ElevenLabs voice synthesis** for AI agent speech capabilities with real-time voice widget integration
- **Puppeteer browser automation** for web interactions, screenshot capture, and autonomous web tasks
- **Task execution engine** that processes different task types (screenshot, chat, voice, planning) with result tracking

### Authentication and Security
- **Encrypted secrets management** using AES-256-CBC encryption for sensitive project data
- **Environment-based configuration** for API keys and database connections
- **Isolated execution environments** preventing cross-project data contamination
- **Secure WebSocket communication** for real-time updates without exposing sensitive information

## External Dependencies

### Core Infrastructure
- **Neon Database** (PostgreSQL hosting) via `@neondatabase/serverless` for primary data storage
- **WebSocket Server** (ws package) for real-time client-server communication
- **Express.js** web framework with TypeScript support

### AI and Automation Services
- **OpenRouter** API service for accessing Claude 3 Opus and GPT-4 Turbo models
- **ElevenLabs** voice synthesis API with Convai widget for real-time voice interactions
- **Puppeteer** for headless browser automation and web scraping capabilities

### Frontend Dependencies
- **React Query** (@tanstack/react-query) for server state management and caching
- **Radix UI** component library for accessible UI primitives
- **Framer Motion** for animations and transitions
- **Tailwind CSS** for styling with shadcn/ui design system
- **Wouter** for lightweight routing

### Development and Build Tools
- **Vite** for frontend build tooling and development server
- **TypeScript** for type safety across the entire stack
- **Drizzle ORM** with Drizzle Kit for database schema management and migrations
- **ESBuild** for backend bundling and production builds
- **PostCSS** with Autoprefixer for CSS processing

### Utility Libraries
- **date-fns** for date manipulation and formatting
- **clsx** and **class-variance-authority** for conditional CSS classes
- **zod** for runtime type validation and schema definition
- **dotenv** for environment variable management