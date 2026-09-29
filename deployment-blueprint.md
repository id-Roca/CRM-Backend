# Deployment Blueprint

## Stack

For this project I used:

- **Application host:** Render
- **Database host:** Aiven PostgreSQL
- **Backend:** Node.js with Express
- **ORM:** Prisma
- **Version control:** GitHub

The deployed architecture is:

GitHub repository → Render Web Service → Aiven PostgreSQL

### 1. Provision the Remote Database and Get the Connection URI

1. Create a project in Aiven.
2. Create a new **PostgreSQL** service.
3. Select the **Free** tier and choose a suitable region.
4. Give the database service a name, for example `crm-db`.
5. Wait until the database service is running.
6. Open **Connection information** in Aiven.
7. Copy the **Service URI**.

The Service URI is the connection string used by Prisma as `DATABASE_URL`. It contains sensitive database credentials and must not be committed to GitHub.

### 2. Set Up Environment Variables Safely

1. Open the Render Web Service settings.
2. Add the required environment variables:
   - `DATABASE_URL` = the Aiven Service URI
   - `JWT_SECRET` = a secure secret value generated in Render
3. Store these values only in Render's environment settings.
4. Keep the local `.env` file in `.gitignore`.

This keeps database credentials and secrets out of version control while still making them available to the deployed application.

### 3. Configure the Build and Start Commands

In Render, configure:

- **Build Command:** `npm install`
- **Start Command:** `node src/server.js`

The application reads the port from `process.env.PORT`, which allows Render to provide the correct port automatically.

For Prisma, run the existing migrations against the remote database with:

`npx prisma migrate deploy`

Then seed the remote database if needed with:

`npm run seed`

### 4. Link GitHub for Automatic Deployments

1. Push the backend project to a GitHub repository.
2. In Render, create a new **Web Service**.
3. Connect Render to GitHub and select the backend repository.
4. Select the `main` branch.
5. Enable automatic deployments.

After this setup, every new push to `main` can trigger a new deployment automatically.

### 5. Test the Deployed Application

1. Copy the public Render URL.
2. Open Postman.
3. Test the deployed login as ADMIN on route:

   `POST https://crm-backend-kids.onrender.com/api/auth/login`

4. Use the returned JWT token for protected routes.
5. Send a GET request to a protected endpoint, such as:

   `GET https://crm-backend-kids.onrender.com/api/companies`

6. Send a POST or PATCH request to create or update data.
7. Verify that the request succeeds and that the data is stored in the remote Aiven PostgreSQL database.

This confirms that the deployed Express API can both read from and write to the remote database.

---

## Test Login Credentials

The following login credentials are provided **only for testing this student project**. In a real production application, user passwords and login credentials would not be published in the deployment documentation.


### Admin

The Admin user can create users, view all users, and perform all operations available to the Sales and Support users.

```json
{
  "email": "admin@crm.local",
  "password": "Admin123!"
}
```

### Sales and Support

The Sales and Support users can create, read, update, and delete company and contact data.

```json
{
  "email": "sales@crm.local",
  "password": "Sales123!"
}
```

```json
{
  "email": "support@crm.local",
  "password": "Support123!"
}
```

Sales and Support users can create, read, update, and delete company and contact data.

### Login

Send a POST request to the deployed login endpoint:

`POST https://crm-backend-kids.onrender.com/api/auth/login`

After a successful login, copy the returned JWT and use it to access the protected API routes.

## Public API Routes

The deployed API can be tested with the following routes.

### Authentication

**Login**

`POST https://crm-backend-kids.onrender.com/api/auth/login`

---

### Companies

**Get all companies**

`GET https://crm-backend-kids.onrender.com/api/companies`

**Get company by ID**

`GET https://crm-backend-kids.onrender.com/api/companies/:id`

**Create company**

`POST https://crm-backend-kids.onrender.com/api/companies`

**Update company**

`PATCH https://crm-backend-kids.onrender.com/api/companies/:id`

**Delete company**

`DELETE https://crm-backend-kids.onrender.com/api/companies/:id`

> ADMIN, SALES and SUPPORT can GET, POST and PATCH companies.  
> Deleting a company is restricted to ADMIN.

---

### Contacts

**Get all contacts**

`GET https://crm-backend-kids.onrender.com/api/contacts`

**Get contact by ID**

`GET https://crm-backend-kids.onrender.com/api/contacts/:id`

**Create contact**

`POST https://crm-backend-kids.onrender.com/api/contacts`

**Update contact**

`PATCH https://crm-backend-kids.onrender.com/api/contacts/:id`

**Delete contact**

`DELETE https://crm-backend-kids.onrender.com/api/contacts/:id`

> ADMIN, SALES and SUPPORT can GET, POST and PATCH contacts.  
> Deleting a contact is restricted to ADMIN.

---

### Users

**Get all users**

`GET https://crm-backend-kids.onrender.com/api/users`

**Get user by ID**

`GET https://crm-backend-kids.onrender.com/api/users/:id`

**Create user**

`POST https://crm-backend-kids.onrender.com/api/users`

**Update user**

`PATCH https://crm-backend-kids.onrender.com/api/users/:id`

**Delete user**

`DELETE https://crm-backend-kids.onrender.com/api/users/:id`

> All user-management routes are restricted to ADMIN.

---

### Authentication Header

Except for the login route, the routes above require a valid JWT.

After logging in, add the returned token to the request:

```http
Authorization: Bearer <JWT_TOKEN>
```

For routes containing `:id`, replace `:id` with the actual ID of the resource.

Example:

`GET https://crm-backend-kids.onrender.com/api/companies/1`