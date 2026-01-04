# Setting Up Custom Port

The frontend is configured to run on port **3001** instead of the default 3000.

## For Windows Users

Create a file named `.env` in the `client` directory with:

```
PORT=3001
REACT_APP_API_URL=http://localhost:5000/api
```

You can copy `client/.env.example` to `client/.env` and it will work.

## For Mac/Linux Users

The `.env` file approach works the same way, or you can set it in your terminal:

```bash
export PORT=3001
cd client
npm start
```

## Alternative: Change Port in package.json

You can also install `cross-env` for cross-platform support:

```bash
cd client
npm install --save-dev cross-env
```

Then update `client/package.json`:

```json
"scripts": {
  "start": "cross-env PORT=3001 react-scripts start",
  ...
}
```

## Current Configuration

- **Backend**: `http://localhost:5000`
- **Frontend**: `http://localhost:3001` (when .env is set)

The server CORS is already configured to allow `localhost:3001`.

