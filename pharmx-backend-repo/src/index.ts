// Configure CORS for API routes
app.use('/api/*', cors({
	origin: (origin) => {
		const allowedOrigins = [
			'https://chat.pharmx.co.uk',
			'http://localhost:3000'
		];

		if (allowedOrigins.includes(origin)) {
			return origin;
		}
		// Allow worker URL for development/testing
		return 'https://pharmx-api-worker.kasimhussain333.workers.dev';
	},
	allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
	allowHeaders: ['Content-Type', 'Authorization'],
	credentials: true,
}))

// Configure CORS for OAuth routes
app.use('/oauth/*', cors({
	origin: (origin) => {
		const allowedOrigins = [
			'https://chat.pharmx.co.uk',
			'http://localhost:3000'
		];

		if (allowedOrigins.includes(origin)) {
			return origin;
		}
		// Allow worker URL for development/testing
		return 'https://pharmx-api-worker.kasimhussain333.workers.dev';
	},
	allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
	allowHeaders: ['Content-Type', 'Authorization'],
	credentials: true,
})) 