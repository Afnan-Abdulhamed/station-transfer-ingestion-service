# Station Transfer Ingestion Service

A high-performance, idempotent, and concurrency-safe service for ingesting station transfer events and providing reconciliation summaries.

## Project structure and data flow

Diagrams are stored as PNG files in the `[docs/](docs/)` folder.


| Diagram                                      | File                                                                             |
| -------------------------------------------- | -------------------------------------------------------------------------------- |
| Layered application structure                | `[docs/project-structure.png](docs/project-structure.png)`                       |
| `POST /transfers` sequence                   | `[docs/post-transfers-sequence.png](docs/post-transfers-sequence.png)`           |
| `GET /stations/:station_id/summary` sequence | `[docs/get-station-summary-sequence.png](docs/get-station-summary-sequence.png)` |


## Tech stack

- **Runtime:** Node.js **≥ 20** 
- **Framework:** Express
- **Database:** PostgreSQL **16**
- **Validation:** Zod
- **Tests:** Vitest, Supertest

## Requirements

- **Git**
- **Docker** and Docker **Compose**.

## Installing and running the project

Follow these steps to run the project.

### 1. Clone the repository

```bash
git clone https://github.com/Afnan-Abdulhamed/station-transfer-ingestion-service.git

cd station-transfer-ingestion-service
```

### 2. Create your local environment file

```bash
cp .env.example .env
```

Open `.env` . For a **first run**, the example values are enough. You may change:


| Variable (examples)                                 | Purpose                                                                                            |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | Postgres superuser, password, and database name (used by the `db` service and passed into the app) |
| `APP_PORT`                                          | Host port mapped to the API inside the container (default **3000**)                                |
| `POSTGRES_PORT`                                     | Host port for Postgres (default **5432**)                                                          |
| `PGADMIN_`*, `PGADMIN_PORT`                         | PgAdmin login and host port (dev profile only; default UI **5050**)                                |
| `COMPOSE_PROFILES=dev`                              | Optional: if set, plain `docker compose up` defaults to the **dev** profile                        |


### 3. What Docker Compose starts (profiles)


| Profile  | Services                   | When to use                                                                                 |
| -------- | -------------------------- | ------------------------------------------------------------------------------------------- |
| **dev**  | `db`, `app-dev`, `pgadmin` | Daily development: the app runs `npm install` and `npm run dev` (nodemon).                  |
| **prod** | `db`, `app`                | Production-like run: image runs `node src/index.js` only (no devDependencies in the image). |


### 4. Run the stack — development (recommended)

From the project root:

```bash
docker compose --profile dev up --build -d
```

### 5. Run the stack — production-style

Start the production profile:

```bash
docker compose --profile prod up --build
```

### Access the application

After the stack is up (dev or prod), run the APIs in an API client:

- **HTTP API:** [http://localhost:3000](http://localhost:3000)

With the **dev** profile you also get:

- **PgAdmin:** [http://localhost:5050](http://localhost:5050).

## Tests

Tests use **Vitest** and **Supertest**.

From the **project root**, with Docker running:

1. Start the database (if it is not already up):
  ```bash
   sudo docker compose --profile dev up -d db
  ```
2. Run the test suite:
  ```bash
   sudo docker compose run --rm app-dev npm test
  ```
   
3. If Compose reports that the service `app-dev` is unknown, pass the dev profile explicitly:
  ```bash
   sudo docker compose --profile dev run --rm app-dev npm test
  ```

## APIs

Example requests for `POST /transfers` and `GET /stations/:station_id/summary` are provided as a **Postman collection** in the repo:

- `[docs/PetroApp - Stations Transfer.postman_collection.json](docs/PetroApp%20-%20Stations%20Transfer.postman_collection.json)`

## Design Notes & Architectural Choices

### Validation strategy: **fail-fast**

I chose the **Fail-Fast** validation strategy to ensure absolute data integrity and simplify system behavior:

- **Atomic Integrity:** By rejecting the entire batch if a single event is malformed, I prevent "partial states" and ensure the database never processes "garbage" data.
- **Reduced Complexity:** It eliminates the need for complex "partial success" tracking, making the ingestion pipeline more predictable and easier to debug.

### **Idempotency Strategy**

Idempotency is enforced at the **Database Schema level** rather than the application level.

- **Implementation:** A UNIQUE constraint is placed on the event_id column.
- **Logic:** I use the INSERT ... ON CONFLICT (event_id) DO NOTHING syntax. This makes the "check-then-insert" operation **atomic**. It prevents the "Time of Check to Time of Use".

### Concurrency

- **Unique primary key** on `event_id` plus **transactional** batch insert prevents double-insert when two requests overlap on the same id.

## Future enhancements (production)

- TypeScript
- Queues:  I chose a **Synchronous Write** model to provide immediate insert counts in the API response. While a **Message Queue ( SQS for example )**  is the perfect choice for high-traffic production to prevent database spikes, it would force an "eventual" response rather than an instant one. For this task, I  prioritized immediate data accuracy over asynchronous complexity.

