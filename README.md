# Titan & Jason

An autonomous system for managing projects and personas with isolated execution environments and secure secrets management.

## Features

- **Project & Persona Isolation**: Each project and persona operates in its own isolated environment with separate memory and secrets.
- **Secure Secrets Management**: Encrypted storage of sensitive data per project/persona.
- **Real-time Updates**: WebSocket-based status updates and logging.
- **Autonomous Execution**: Projects and personas can operate independently with their own AI agents.
- **Browser Automation**: Puppeteer integration for web interactions and screenshots.

## Project Structure

```
.
├── core/
│   ├── brain.ts       # Task execution logic
│   ├── logger.ts      # JSON-based logging
│   ├── manager.ts     # Project/persona management
│   ├── memory.ts      # Persistent state
│   ├── secrets.ts     # Encrypted secrets
│   ├── status.ts      # System status
│   └── websocket.ts   # Real-time updates
├── data/
│   ├── logs/         # JSON log files
│   ├── secrets/      # Encrypted secrets
│   └── queue.json    # Task queue
├── output/
│   ├── screenshots/  # Browser screenshots
│   ├── audio/        # Generated audio
│   └── status.json   # Current status
├── puppeteer/
│   └── screenshot.ts # Browser automation
└── services/
    ├── openrouter.ts # AI model integration
    └── elevenlabs.ts # Voice generation
```

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```bash
cp .env.example .env
```

3. Set environment variables:
```
OPENROUTER_API_KEY=your_key_here
ELEVENLABS_API_KEY=your_key_here
ENCRYPTION_KEY=your_encryption_key_here
```

4. Start development server:
```bash
npm run dev
```

## Usage

### Creating a Project
```typescript
const project = await agentManager.createAgent('project-001', 'project', 'My Project');
```

### Creating a Persona
```typescript
const persona = await agentManager.createAgent('persona-001', 'persona', 'Ethan');
```

### Managing Secrets
```typescript
// Save project secrets
await agentManager.saveAgentSecrets('project-001', 'project', {
  apiKey: 'secret-key'
});

// Load project secrets
const secrets = await agentManager.loadAgentSecrets('project-001', 'project');
```

### Logging Actions
```typescript
await agentManager.logAgentAction('project-001', 'task_completed', {
  taskId: 'task-123',
  result: 'success'
});
```

## Security

- All secrets are encrypted using AES-256-CBC
- Each project/persona has isolated memory and secrets
- No cross-contamination between agents
- Secure WebSocket communication

## License

MIT 