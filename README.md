# Car Tire Sales (Expo / React Native)

Lightweight point-of-sale mobile app for car tire shops built with Expo and Appwrite backend utilities.

## Highlights
- Expo + React Native frontend
- Appwrite backend integrations
- Permission and sync utilities, offline support
- Demo screenshot: `assets/emulator_screenshot.png`

## Tech stack
- React Native (Expo)
- TypeScript
- Appwrite (backend)
- Node.js / npm

## Quick setup (developer)
1. Copy environment variables from `.env.example` to `.env` and fill values.
2. Install dependencies:

```bash
npm ci
```

3. Start Expo (local development):

```bash
# from repo root
npx expo start
# or use the VS Code task: Run Expo Android
```

4. To run tests:

```bash
npm test
```

## Environment
- This repository does NOT include secret `.env` files. Use `.env.example` as a template.
- Keep production keys out of GitHub. If you accidentally commit secrets, rotate them and remove from history.

## Files of interest
- App entry: `app/index.tsx`
- Components: `components/`
- Scripts and setup helpers: `scripts/`, `setup-*.sh`

## Contributing
- Please open issues or pull requests. Add tests for new functionality.

## Screenshot / Demo
Add a short GIF or screenshot to `assets/` and update this README to show it.

## License
License file not yet added. If you want MIT, Apache-2.0, or another license, tell me and I'll add it.
