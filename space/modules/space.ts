import { defineNuxtModule, logger } from 'nuxt/kit'
import { defu } from 'defu'
import { join, relative, dirname } from 'pathe'
import { sha256 } from 'ohash'
import { writeFile } from 'node:fs/promises'
import { existsSync, mkdirSync } from 'node:fs'
import { watch } from 'chokidar'
import { debounce } from 'perfect-debounce'
import { execa } from 'execa'

export default defineNuxtModule({
  meta: {
    name: 'nuxt-space',
  },
  async setup(_options, nuxt) {
    const rootDir = nuxt.options.rootDir
    const runtimeConfig = nuxt.options.runtimeConfig

    // KV settings
    runtimeConfig.kv = defu(runtimeConfig.kv, {
      dir: join(rootDir, 'data', 'kv')
    })
    // Db settings
    runtimeConfig.db = defu(runtimeConfig.db, {
      tables: join(rootDir, 'server', 'db', 'tables.ts'),
      migrations: join(rootDir, 'server', 'db', 'migrations'),
      database: join(rootDir, 'data', 'db.sqlite')
    })
    // Create the databse directory
    if (!existsSync(runtimeConfig.db.database)) {
      mkdirSync(dirname(runtimeConfig.db.database), { recursive: true })
    }

    // Session settings
    runtimeConfig.session = defu(runtimeConfig.session, {
      name: 'nuxt-space-session',
      password: ''
    })
    if (nuxt.options.dev && !process.env.NUXT_SESSION_PASSWORD) {
      const randomPassword = sha256(`${Date.now()}${Math.random()}`).slice(0, 32)
      logger.warn(`No session password set, using a random password.\nPlease set NUXT_SESSION_PASSWORD in your .env file with at least 32 chars.\nNUXT_SESSION_PASSWORD=${randomPassword}`)
      runtimeConfig.session.password = randomPassword
    }

    // OAuth settings
    runtimeConfig.oauth = defu(runtimeConfig.oauth, {})
    // GitHub Oauth
    runtimeConfig.oauth.github = defu(runtimeConfig.oauth.github, {
      clientId: '',
      clientSecret: '',
      authorizationURL: 'https://github.com/login/oauth/authorize',
      tokenURL: 'https://github.com/login/oauth/access_token'
    })
    
    // Drizzle Files
    if (nuxt.options.dev) {
      const drizzleConfig = {
        out: relative(rootDir, join(runtimeConfig.db.migrations)),
        schema: relative(rootDir, join(runtimeConfig.db.tables)),
        breakpoints: true
      }
      // Create drizzle.config.json
      const drizzleConfigPath = join(rootDir, 'drizzle.config.json')
      await writeFile(drizzleConfigPath, JSON.stringify(drizzleConfig, null, 2), 'utf8')
      // Create tables.ts if it doesn't exist
      if (!existsSync(runtimeConfig.db.tables)) {
        mkdirSync(dirname(runtimeConfig.db.tables), { recursive: true })
        await writeFile(runtimeConfig.db.tables, 'import { sqliteTable, text, integer } from \'drizzle-orm/sqlite-core\'\n', 'utf8')
      }
      const watcher = watch(runtimeConfig.db.tables).on('change', debounce(async () => {
        logger.info('`'+relative(rootDir, runtimeConfig.db.tables) + '` changed, running `npx drizzle-kit generate:sqlite`')
        await execa('npx', ['drizzle-kit', 'generate:sqlite'], { cwd: rootDir })
        logger.info('Restarting server to migrate database')
        watcher.close()
        await nuxt.hooks.callHook('restart')
      }))
    }
    // logger.info('Make sure to run `npx drizzle-kit generate:sqlite` to generate the database schema and migrations when changing `server/db/tables.ts`')
    logger.success('Nuxt Space module ready')
    await execa('npx', ['drizzle-kit', 'generate:sqlite'], { cwd: rootDir })
  }
})