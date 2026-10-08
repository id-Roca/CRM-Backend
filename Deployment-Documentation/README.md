# CRM Backend API

A REST API for a small Customer Relationship Management (CRM) system.

The project manages companies, their contacts, and CRM users. It was built as a backend learning project using Node.js, Express, PostgreSQL, and Prisma.

## Part 1: Deployment Concepts & Fundamentals

1. **What is deployment?**

**Deployment** means taking an aplication and putting it into an environment that can run on the internet. **Backend deployment** is the process of taking an application that runs locally during development and making it run on infrastructure accessible through the internet. It is necessary in production because users and other applications need a reliable way to reach the API without depending on the developer's personal computer.

2. **The Deployment Process:**

After the code is pushed to GitHub, a connected hosting platform retrieves the code and prepares an environment in which it can run. It installs the project's dependencies, performs any necessary build or setup steps, loads configured environment variables, and starts the Node.js application using its start command. The platform exposes the running application through a public URL. Requests sent to that URL can then reach the Express server, which processes them and communicates with services such as the database before returning a response.

3. **The Localhost Limitation:**

`localhost` is only accessible from the machine on which the application is running, so external users cannot use it as a public API. A personal computer is also unsuitable as a production server because it may sleep, restart, lose its internet connection or be turned off, and exposing a development computer directly to the internet creates security and reliability problems. Production hosting provides infrastructure designed to keep the application available and reachable through a public address.

4. **Separation of Concerns:**

Application servers and databases have **different responsibilities and infrastructure requirements**, so they are commonly hosted separately in production. The Express application can be updated, restarted or scaled independently, while the database requires persistent storage, backups, controlled access and database-specific maintenance. A managed database service can handle many of these responsibilities. Separating them also improves reliability, security and scalability because a change or resource requirement in one component does not necessarily require changing the other.

GitHub stores the **code**. A hosting provider runs the **application**. A database provider stores the **persistent data**. Environment variables provide the **secrets/configuration**. A public URL gives clients a way to **reach the API**.

---

## Part 2: Platform Landscape & Student Options

1. **Platform Research**

   ### 1. Backend Application Hosting

**Render**

Render offers a free Web Service suitable for a small Node.js/Express backend. The free instance currently has **0.1 CPU and 512 MB RAM**. It includes **750 free instance hours per workspace per month**. A free service spins down after 15 minutes without incoming traffic and starts again when a new request arrives, which can take about a minute.

This is the platform I chose for the CRM backend.

**Railway**

Railway also supports Node.js applications. Its Free plan has **no monthly subscription fee** and includes **$1 of resource usage per month**. The application consumes this credit depending on the resources it uses. A service can use up to **1 vCPU and 0.5 GB RAM**.

Unlike Render's free instance model, Railway is more directly **usage-based**: the monthly credit pays for the resources the application consumes.

### 2. Database-as-a-Service Providers

**Aiven PostgreSQL**

Aiven's Free PostgreSQL tier provides:

- 1 CPU
- 1 GB RAM
- 1 GB storage
- Maximum 20 database connections
- No connection pooling
- One free service of each type per organization

It does not require a credit card and has no fixed time limit. Aiven can power off inactive free databases, which can later be powered back on.

This is the database provider I chose for the CRM.

**Supabase**

Supabase's Free plan provides a PostgreSQL database with **500 MB database size**, shared CPU and up to **500 MB RAM**. It also includes 5 GB uncached egress, 5 GB cached egress, and 1 GB file storage. The Free plan allows two active projects.

Free projects with low activity over a seven-day period can be paused and later restored.

### 3. Cost Analysis

For students who want to avoid unexpected costs, **Aiven Free and Supabase Free are straightforward database choices because their free resources have defined limits rather than automatically becoming paid services.** Aiven explicitly states that its Free PostgreSQL service does not require a credit card.

Railway's Free plan also requires no credit card, but its model is based on monthly usage credits. Moving to Hobby costs a minimum of **$5/month**, with additional resource usage charged beyond the included $5 credit.

Render's free Web Service is $0 compute, but its free workspace currently includes **5 GB of outbound bandwidth per month**, after which outbound bandwidth is priced at **$0.15/GB**. Therefore, usage limits and billing settings should still be checked before using it for a high-traffic application.

For a small student project, staying strictly within the free plans and monitoring usage is the safest approach.

## Part 3: Understanding Free Tier Limits

### 1. RAM / Memory Limits

RAM is the memory the application uses while it is running. Render's free service has **512 MB RAM**. If the app uses too much memory, it can become slow or crash.

### 2. Cold Starts / Sleep Cycles

Free servers may go to sleep when nobody uses them. Render does this after **15 minutes of inactivity**. The next request can therefore take longer while the server starts again.

### 3. Compute Hours & CPU Quotas

**Compute hours** are the amount of time the server is allowed to run. **CPU** is the processing power available to the application.

Render provides **750 free instance hours per month**. If the compute-hour limit is reached, the free service can no longer run until the limit resets. If the CPU is overloaded, users may notice slower responses.

### 4. Database Storage & Active Connections

**Database storage** is how much data can be saved in the database. Aiven's free PostgreSQL database provides **1 GB of storage**.

**Database connections** are the number of connections that can be open to the database at the same time. Aiven allows up to **20 connections** on the free tier.

Prisma uses connection pooling to reuse connections. If all available connections are busy, new database requests may have to wait or fail.

### 5. Outbound Data Transfer / Bandwidth

**Bandwidth** is the amount of data the server sends over the internet. For example, when the CRM API sends a JSON response to a user, this counts as outbound data.

Render includes **5 GB of outbound bandwidth per month** on the free tier. If an application has many users or sends large amounts of data, it can reach this limit faster.
