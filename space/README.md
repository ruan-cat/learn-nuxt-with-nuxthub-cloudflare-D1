# Nuxt Space

Enter to the galaxy of fullstack apps running on the edge.

⚠️ this is a work in progress, not ready for production yet, the layer is going to be changed to a module very soon.

## Features

- Session management with secured & sealed cookie sessions
- Helpers for OAuth support (GitHub, more soon)
- Backed in database with SQLite
- Create and query typed collections with `useDB()`
- Access key-value storage with `useKV()`

Nuxt Space leverages SQLite in development and uses [D1](https://developers.cloudflare.com/d1/) or [Turso](https://turso.tech) in production.

## Setup

```bash
pnpm i -D nuxt-space-layer
```

Add it to your `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  extends: 'nuxt-space-layer'
})
```

Next, add a `NUXT_SESSION_PASSWORD` env variable with at least 32 characters in the `.env`.

```bash
# .env
NUXT_SESSION_PASSWORD=password-with-at-least-32-characters
```

Nuxt Space can generate one for you when running Nuxt in development the first time when no `NUXT_SESSION_PASSWORD` is set.

Lastly, Nuxt Space will create a `data/` directory to store the sqlite database, KV and files. If you don't want to keep the same data between each developers, add the `data/` directory to the `.gitignore`:

```
node_modules
.nuxt
.output
.env
dist
data
```

## Vue Composables

Space automatically add some plugins to fetch the current user session to let you access it from your Vue components.

### User Session

```vue
<script setup>
const { loggedIn, user, session, clear } = useUserSession()
</script>

<template>
  <div v-if="loggedIn">
    <h1>Welcome {{ user.login }}!</h1>
    <p>Logged in since {{ session.loggedInAt }}</p>
    <button @click="clear">Logout</button>
  </div>
  <div v-else>
    <h1>Not logged in</h1>
    <a href="/api/auth/github">Login with GitHub</a>
  </div>
</template>
```

## Server Utils

### Session Management

```ts
// Set a user session, note that this data is encrypted in the cookie but can be decrypted with an API call
// Only store the data that allow you to recognize an user, but do not store sensitive data
await setUserSession(event, {
  user: {
    // ... user data
  },
  loggedInAt: new Date()
  // Any extra fields
})

// Get the current user session
const session = await getUserSession(event)

// Clear the current user session
await clearUserSession(event)

// Require a user session (send back 401 if no `user` key in session)
const session = await requireUserSession(event)
```

### Database Helpers (SQLite)

```ts
// Returns a Drizzle instance
const db = useDB()

// All tables defined in `~/server/db/tables.ts`
tables.*
```

#### Example

Table definition in `~/server/db/tables.ts`

```ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const todos = sqliteTable('todos', {
  id: integer('id').primaryKey(),
  userId: integer('user_id').notNull(), // GitHub Id
  title: text('title').notNull(),
  completed: integer('completed').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
})
```

Learn more about [Drizzle SQLite](https://github.com/drizzle-team/drizzle-orm/blob/main/drizzle-orm/src/sqlite-core/README.md)

API route to list all todos for the current user in `~/server/api/todos.get.ts`

```ts
import { eq } from 'drizzle-orm'

export default eventHandler(async (event) => {
  const session = await requireUserSession(event)

  // List todos for the current user
  return await useDB()
    .select()
    .from(tables.todos)
    .where(eq(tables.todos.userId, session.user.id))
    .all()
})
```

### Key-Value Store

```ts
const store = useKV(prefix?: string)

await store.getKeys()
await store.setItem(key, value)
await store.getItem(key, value)
await store.removeItem(key, value)
// Read more on all available methods on https://unstorage.unjs.io
```

### OAuth Event Handlers

### GitHub

The `githubOAuthEventHandler({ onSuccess, config?, onError? })` will return an event handler that automatically redirects to GitHub OAuth page and then call `onSuccess` or `onError` depending on the result.

Example: `~/server/api/auth/github.get.ts`

```ts
export default gitHubOAuthEventHandler({
  async onSuccess(event, { user, accessToken }) {
    await setUserSession(event, { user })
    return sendRedirect(event, '/')
  },
  // Optional, will return a json error and 401 status code by default
  onError(event, error) {
    console.error('GitHub OAuth error:', error)
    return sendRedirect(event, '/')
  },
})
```

### Event Handlers Helpers

Coming soon.

```ts
export default neoEventHandler({
  // require session
  session: true,
  // validation
  validate: {
    body: {
      title: z.string(),
      completed: z.boolean().optional().default(false),
    },
  },
  handler (event) {
    // event.context.session
    // event.context.body is parsed and validation
  }
})

## Deploy

**useDB()**:
- `D1_DB` environment variable with D1 binding or `TURSO_DB_URL` + `TURSO_DB_TOKEN` to connect with Turso database

**useKV()**:
- `KV` environment variable with CloudFlare KV binding