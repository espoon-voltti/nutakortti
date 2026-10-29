# Mobiilinutakortti

The application consists of three subprojects: backend, frontend and admin-frontend.

* Admin-frontend is used by the youth workers to handle registered members and their info. The QR code reading is also part of this.
* Frontend is the end user web application used by the youth to see information about the youth clubs and generate a personal QR code for checking in.
* Backend has endpoints for both frontends and for Suomi.fi identification. It uses PostgreSQL for database.

More detailed documentation is found in a README in respective directories of each project.

## Technologies

- Frontend : React *(running on port 3001)*
- Backend : NestJS *(running on port 3000)*
- Admin-Frontend : React Admin *(running on port 3002)*
- Database : PostgreSQL *(running on port 5432)*
- Session cache : Redis *(running on port 6379)*

## Running the app

The app can be tested by using docker compose:

```bash
docker-compose up -d
```

Open http://localhost:8080/ (frontend) or http://localhost:8080/nuorisotyontekijat/ (admin-frontend) in your browser.

## Development

Start the database and redis in docker-compose:

```bash
docker-compose up -d db redis
```

Start the backend, frontend and admin-frontend in separate terminals.

*Backend* (port 3000):

```bash
cd backend
npm install
./run-dev.sh
```

*Frontend* (port 3001):

```bash
cd frontend
npm install
PORT=3001 npm run start
```

Open http://localhost:3001/ in your browser.

*Admin-frontend* (port 3002):

```bash
cd admin-frontend
npm install
PORT=3002 npm run dev
```

Open http://localhost:3002/ in your browser.

## Test data

Currently, there's no user interface for creating youth clubs. You can insert them directly to the database to the
`clubs` table.

Logging via mock AD creates uses automatically. To test superuser features, set a user's `isSuperUser` column to true in
the `admin` table.

Use these two to create and remove test youth data:

* Create 100 test cases:
  `curl --location --request POST 'http://localhost:3000/api/junior/createTestDataJuniors' --header 'Content-Type: application/json' --data-raw '{ "numberOfCases": "100" }'`
* Delete all created test cases:
  `curl --location --request POST 'http://localhost:3000/api/junior/deleteTestDataJuniors' --header 'Content-Type: application/json'`

## Testing SMS functionality

To test SMS functionality locally, rename `.env.template` file to `.env` in */backend* and update the Telia
username/password/user fields with right values

## QR-code reading

Qr-code check-in endpoint is open by default, and should be accessible without authentication. This is due the removal
of session-token when entering to QR-code screen, to prevent end-user to navigate to other parts of the application.

## Troubleshooting

### Login not working

Docker volumes sometimes get messed up and database won't work, often indicated by login not working. This might be
indicated by error message such as:

`Failed Password Authentication for user 'postgres'`

Bring down the Docker containers with: `docker-compose down`

To nuke the database, remove Docker volume from the PostgreSQL container, and bring the application up again.

### admin-frontend (or some other) build errors out

When running "docker-compose up" you might get an error like this:

    admin-frontend_1  | events.js:174
    admin-frontend_1  |       throw er; // Unhandled 'error' event
    admin-frontend_1  |       ^
    admin-frontend_1  |
    admin-frontend_1  | Error: ENOSPC: System limit for number of file watchers reached, watch '/admin-frontend/public'

or your build may error randomly.

There's a lot of files under node_modules and they are all being watched, reaching the system limit. Each file watcher
takes up some kernel memory, and therefore they are limited to some reasonable number by default. On a Ubuntu Linux the
limit can be increased for example like this:

    echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf && sudo sysctl -p

Increasing memory limits for Docker might also help if for example you are using the Docker Desktop app to constrain
them in the first place.
