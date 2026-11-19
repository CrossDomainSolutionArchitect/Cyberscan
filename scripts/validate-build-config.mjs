const names = ['VITE_TURNSTILE_SITE_KEY','VITE_CLERK_PUBLISHABLE_KEY','VITE_CYBERSCAN_API_URL'];
for (const name of names) {
  if (!process.env[name]?.trim()) throw new Error('Missing required build variable: ' + name);
}
if (!process.env.VITE_CLERK_PUBLISHABLE_KEY.startsWith('pk_live_')) throw new Error('Production Clerk publishable key required');
if (process.env.VITE_TURNSTILE_SITE_KEY !== '0x4AAAAAAGG1OQfkmyQK7CHu') throw new Error('Unexpected production Turnstile site key');
const api = new URL(process.env.VITE_CYBERSCAN_API_URL);
if (api.origin !== 'https://cyberscan-api.vvsharbney.workers.dev' || api.username || api.password || api.pathname !== '/' || api.search || api.hash) throw new Error('Unexpected production API endpoint');
console.log('Production build configuration validated');
