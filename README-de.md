# CRM Backend API

## 1. Über das Projekt

Die CRM Backend API ist eine REST API für ein kleines
Customer-Relationship-Management-System. Sie wurde entwickelt, um
Kundenbeziehungen und typische Geschäftsprozesse in einer
Backend-Anwendung zu verwalten.

Die API ermöglicht es Benutzern, Unternehmen und Kontakte zu verwalten,
Angebote und Rechnungen zu erstellen sowie Support-Tickets zu
bearbeiten. Zusätzlich enthält sie eine Benutzerverwaltung mit
rollenbasierten Berechtigungen für Administratoren, Sales- und
Support-Benutzer.

### Hauptfunktionen

-   Verwaltung von Unternehmen und Kontakten
-   Verwaltung von Angeboten und Rechnungen
-   Verwaltung von Support-Tickets
-   Benutzerverwaltung mit rollenbasiertem Zugriff
-   JWT-basierte Authentifizierung
-   Filterung und Pagination für unterstützte Ressourcen
-   Eingabevalidierung und zentrale Fehlerbehandlung

## 2. Tech Stack

-   **Node.js** --- JavaScript-Laufzeitumgebung für die
    Backend-Anwendung.
-   **Express.js** --- Web-Framework zur Erstellung der REST API, Routen
    und Middleware.
-   **PostgreSQL** --- Relationale Datenbank zur persistenten
    Speicherung und Verwaltung verknüpfter CRM-Daten.
-   **Prisma ORM** --- Wird zur Definition des Datenmodells, zur
    Verwaltung von Migrationen und zur Interaktion mit PostgreSQL
    verwendet.
-   **Zod** --- Wird verwendet, um Request-Daten zu validieren, bevor
    sie die Datenbank erreichen.
-   **JSON Web Tokens (JWT)** --- Werden für die zustandslose
    Authentifizierung geschützter Routen verwendet.
-   **bcrypt** --- Wird verwendet, um Benutzerpasswörter sicher zu
    hashen.
-   **CORS** --- Wird verwendet, um zu steuern, welche Frontend-Origins
    auf die API zugreifen dürfen.
-   **express-rate-limit** --- Wird verwendet, um wiederholte Requests
    zu begrenzen und sensible Endpoints zu schützen.
-   **Jest & Supertest** --- Werden für automatisierte API- und
    Integrationstests verwendet.

## 3. Datenmodell / ERD

Das CRM verwendet eine relationale PostgreSQL-Datenbank mit sechs
Hauptentitäten:

-   **Company** --- repräsentiert ein Kundenunternehmen und kann mehrere
    Kontakte, Angebote, Rechnungen und Tickets haben.
-   **Contact** --- gehört zu einem Unternehmen und kann mit Angeboten,
    Rechnungen und Tickets verknüpft sein.
-   **User** --- repräsentiert einen authentifizierten CRM-Benutzer mit
    der Rolle `ADMIN`, `SALES` oder `SUPPORT`.
-   **Offer** --- gehört zu einem Unternehmen, kann mit einem Kontakt
    verknüpft sein und hat einen verantwortlichen Sales-Benutzer.
-   **Invoice** --- gehört zu einem Unternehmen und einem
    Sales-Benutzer, kann optional mit einem Kontakt verknüpft sein und
    kann aus einem Angebot erstellt werden.
-   **Ticket** --- gehört zu einem Unternehmen und einem Kontakt,
    speichert den Benutzer, der es erstellt hat, und kann optional mit
    einem Angebot, einer Rechnung und einem zugewiesenen Benutzer
    verknüpft sein.

------------------------------------------------------------------------

### Beziehungen zwischen den Entitäten

Das folgende Diagramm zeigt eine vereinfachte Übersicht darüber, wie die
wichtigsten CRM-Entitäten miteinander verbunden sind:

``` mermaid
erDiagram
    COMPANY ||--o{ CONTACT : has
    COMPANY ||--o{ OFFER : has
    COMPANY ||--o{ INVOICE : has
    COMPANY ||--o{ TICKET : has

    CONTACT o|--o{ OFFER : linked_to
    CONTACT o|--o{ INVOICE : linked_to
    CONTACT ||--o{ TICKET : has

    USER ||--o{ OFFER : manages
    USER ||--o{ INVOICE : manages
    USER ||--o{ TICKET : creates
    USER o|--o{ TICKET : assigned_to

    OFFER o|--o{ INVOICE : source_for
    OFFER o|--o{ TICKET : linked_to

    INVOICE o|--o{ TICKET : linked_to
```

------------------------------------------------------------------------

### Datenbankschema

Das detaillierte ERD zeigt die wichtigsten Datenbankfelder, Primary
Keys, Foreign Keys und Beziehungen zwischen den CRM-Entitäten:

``` mermaid
erDiagram
    COMPANY {
        Int id PK
        String name UK
        String industry
    }

    CONTACT {
        Int id PK
        String name
        String email UK
        Int companyId FK
    }

    USER {
        Int id PK
        String name
        String email UK
        String passwordHash
        Role role
        DateTime createdAt
    }

    OFFER {
        Int id PK
        String description
        Decimal amount
        OfferStatus status
        Int companyId FK
        Int contactId FK "optional"
        Int salesUserId FK
        DateTime createdAt
        DateTime updatedAt
    }

    INVOICE {
        Int id PK
        Int offerId FK "optional"
        Int companyId FK
        Int contactId FK "optional"
        Int salesUserId FK
        String companyName
        String contactName "optional"
        String salesUserName
        String description
        Decimal amount
        InvoiceStatus status
        DateTime createdAt
        DateTime updatedAt
    }

    TICKET {
        Int id PK
        String subject
        String description
        TicketStatus status
        TicketPriority priority
        Int companyId FK
        Int contactId FK
        Int offerId FK "optional"
        Int invoiceId FK "optional"
        Int createdById FK
        Int assignedUserId FK "optional"
        DateTime createdAt
        DateTime updatedAt
    }

    COMPANY ||--o{ CONTACT : has
    COMPANY ||--o{ OFFER : has
    COMPANY ||--o{ INVOICE : has
    COMPANY ||--o{ TICKET : has

    CONTACT o|--o{ OFFER : linked_to
    CONTACT o|--o{ INVOICE : linked_to
    CONTACT ||--o{ TICKET : has

    USER ||--o{ OFFER : manages
    USER ||--o{ INVOICE : manages
    USER ||--o{ TICKET : creates
    USER o|--o{ TICKET : assigned_to

    OFFER o|--o{ INVOICE : source_for
    OFFER o|--o{ TICKET : linked_to
    INVOICE o|--o{ TICKET : linked_to
```

------------------------------------------------------------------------

### Rollen-Workflows

Die API unterstützt drei Benutzerrollen. Die folgenden Diagramme zeigen
die wichtigsten Workflows und Verantwortlichkeiten der jeweiligen Rolle:

#### **ADMIN**

``` mermaid
flowchart LR
    A[ADMIN]

    A --> B[Benutzer verwalten]

    A --> C[Unternehmen verwalten]
    C --> D[Kontakte verwalten]

    A --> E[Angebote verwalten]
    E --> F[Sales-Benutzer zuweisen]
    E --> G[Rechnungen erstellen / verwalten]

    A --> H[Tickets verwalten]
    H --> I[Benutzer zuweisen]
```

------------------------------------------------------------------------

#### **SALES**

``` mermaid
flowchart LR
    A[SALES]

    A --> B[Unternehmen]
    B --> C[Unternehmen erstellen / aktualisieren]

    A --> D[Kontakte]
    D --> E[Kontakte erstellen / aktualisieren]

    A --> F[Angebote erstellen / verwalten]
    A --> G[Direkte Rechnungen erstellen]
    F --> H[Rechnungen aus Angeboten erstellen]

    A --> I[Bestehende Tickets]
    I --> J[Lesen / Aktualisieren / Neu zuweisen]
```

------------------------------------------------------------------------

#### **SUPPORT**

``` mermaid
flowchart LR
    A[SUPPORT]

    A --> B[Unternehmen]
    B --> C[Unternehmen erstellen / aktualisieren]

    A --> D[Kontakte]
    D --> E[Kontakte erstellen / aktualisieren]

    A --> F[Angebote lesen]
    A --> G[Rechnungen lesen]

    A --> H[Tickets erstellen / verwalten]
    H --> I[Unternehmen & Kontakt verknüpfen]
    H --> J[Optional Angebot / Rechnung verknüpfen]
```

------------------------------------------------------------------------

## 4. Authentifizierung & Sicherheit

### Authentifizierung

Die API verwendet JSON Web Tokens (JWT) zur Authentifizierung.

Benutzer melden sich über folgenden Endpoint an:

`POST /api/auth/login`

Eine erfolgreiche Anmeldung gibt ein JWT zurück, das bei geschützten
Requests mitgesendet werden muss:

``` text
Authorization: Bearer <token>
```

### Rollenbasierte Autorisierung

Die API unterstützt drei Rollen:

-   **ADMIN** --- vollständige Benutzerverwaltung und umfassender
    Zugriff auf die CRM-Ressourcen.
-   **SALES** --- verwaltet Unternehmen, Kontakte, Angebote und
    Rechnungen und kann bestehende Tickets lesen oder aktualisieren.
-   **SUPPORT** --- verwaltet Unternehmen, Kontakte und Tickets und hat
    Lesezugriff auf Angebote und Rechnungen.

Berechtigungen werden auf Routenebene mithilfe von Authentifizierungs-
und Rollenautorisierungs-Middleware durchgesetzt.

### Eingabevalidierung

Request-Bodies, Routenparameter, Filter und Pagination-Werte werden mit
**Zod** validiert, bevor Datenbankoperationen ausgeführt werden.

Ungültige Eingaben führen zu einer `400 Bad Request` Response.

### Passwortsicherheit

Benutzerpasswörter werden mit **bcrypt** gehasht, bevor sie in der
Datenbank gespeichert werden. Passwörter werden nicht im Klartext
gespeichert.

### CORS

CORS ist so konfiguriert, dass kontrolliert wird, welche Client-Origins
auf die API zugreifen dürfen.

### Rate Limiting

Rate Limiting wird verwendet, um Missbrauch durch wiederholte Requests
zu reduzieren und sensible Endpoints wie die Authentifizierung zu
schützen.

### Fehlerbehandlung

Fehler werden zentral behandelt, sodass API-Clients kontrollierte
Responses erhalten, ohne dass interne Implementierungsdetails
offengelegt werden.

------------------------------------------------------------------------

## 5. API Endpoints

Die API ist in sieben Hauptressourcen organisiert. Die folgenden
Tabellen geben einen Überblick über die verfügbaren Endpoints, die
erforderlichen Zugriffsrollen und ihren Zweck.

### Authentifizierung

  --------------------------------------------------------------------------
  Methode           Endpoint            Zugriff           Zweck
  ----------------- ------------------- ----------------- ------------------
  POST              `/api/auth/login`   Öffentlich        Benutzer
                                                          authentifizieren
                                                          und JWT
                                                          zurückgeben

  --------------------------------------------------------------------------

### Benutzer

Alle Endpoints zur Benutzerverwaltung erfordern die Rolle `ADMIN`.

  Methode   Endpoint           Zugriff   Zweck
  --------- ------------------ --------- ------------------------
  GET       `/api/users`       ADMIN     Alle Benutzer abrufen
  GET       `/api/users/:id`   ADMIN     Einen Benutzer abrufen
  POST      `/api/users`       ADMIN     Benutzer erstellen
  PATCH     `/api/users/:id`   ADMIN     Benutzer aktualisieren
  DELETE    `/api/users/:id`   ADMIN     Benutzer löschen

### Unternehmen

  ----------------------------------------------------------------------------
  Methode           Endpoint               Zugriff           Zweck
  ----------------- ---------------------- ----------------- -----------------
  GET               `/api/companies`       ADMIN, SALES,     Alle Unternehmen
                                           SUPPORT           abrufen

  GET               `/api/companies/:id`   ADMIN, SALES,     Ein Unternehmen
                                           SUPPORT           abrufen

  POST              `/api/companies`       ADMIN, SALES,     Unternehmen
                                           SUPPORT           erstellen

  PATCH             `/api/companies/:id`   ADMIN, SALES,     Unternehmen
                                           SUPPORT           aktualisieren

  DELETE            `/api/companies/:id`   ADMIN             Unternehmen
                                                             löschen
  ----------------------------------------------------------------------------

Unternehmen können nach Namen durchsucht werden:

``` text
GET /api/companies?search=stark
```

### Kontakte

  ---------------------------------------------------------------------------
  Methode           Endpoint              Zugriff           Zweck
  ----------------- --------------------- ----------------- -----------------
  GET               `/api/contacts`       ADMIN, SALES,     Alle Kontakte
                                          SUPPORT           abrufen

  GET               `/api/contacts/:id`   ADMIN, SALES,     Einen Kontakt
                                          SUPPORT           abrufen

  POST              `/api/contacts`       ADMIN, SALES,     Kontakt erstellen
                                          SUPPORT           

  PATCH             `/api/contacts/:id`   ADMIN, SALES,     Kontakt
                                          SUPPORT           aktualisieren

  DELETE            `/api/contacts/:id`   ADMIN             Kontakt löschen
  ---------------------------------------------------------------------------

Kontakte können nach Name oder E-Mail-Adresse durchsucht werden:

``` text
GET /api/contacts?search=anna
```

### Angebote

  -------------------------------------------------------------------------
  Methode           Endpoint            Zugriff           Zweck
  ----------------- ------------------- ----------------- -----------------
  GET               `/api/offers`       ADMIN, SALES,     Angebote abrufen
                                        SUPPORT           

  GET               `/api/offers/:id`   ADMIN, SALES,     Ein Angebot
                                        SUPPORT           abrufen

  POST              `/api/offers`       ADMIN, SALES      Angebot erstellen

  PATCH             `/api/offers/:id`   ADMIN, SALES      Angebot
                                                          aktualisieren
  -------------------------------------------------------------------------

Angebote werden nicht gelöscht. Stattdessen können sie in den Status
`CANCELLED` versetzt werden.

Unterstützte Filter:

``` text
GET /api/offers?status=SENT
GET /api/offers?companyId=1
GET /api/offers?salesUserId=2
GET /api/offers?page=1&limit=10
```

### Rechnungen

  ---------------------------------------------------------------------------
  Methode           Endpoint              Zugriff           Zweck
  ----------------- --------------------- ----------------- -----------------
  GET               `/api/invoices`       ADMIN, SALES,     Rechnungen
                                          SUPPORT           abrufen

  GET               `/api/invoices/:id`   ADMIN, SALES,     Eine Rechnung
                                          SUPPORT           abrufen

  POST              `/api/invoices`       ADMIN, SALES      Rechnung
                                                            erstellen

  PATCH             `/api/invoices/:id`   ADMIN, SALES      Rechnung
                                                            aktualisieren
  ---------------------------------------------------------------------------

Rechnungen können entweder direkt aus CRM-Kundendaten oder aus einem
bestehenden akzeptierten Angebot erstellt werden. Ein Angebot kann mit
mehreren Rechnungen verknüpft sein. Rechnungen werden nicht gelöscht.

Unterstützte Filter:

``` text
GET /api/invoices?status=PAID
GET /api/invoices?companyId=1
GET /api/invoices?page=1&limit=10
```

### Tickets

  --------------------------------------------------------------------------
  Methode           Endpoint             Zugriff           Zweck
  ----------------- -------------------- ----------------- -----------------
  GET               `/api/tickets`       ADMIN, SALES,     Tickets abrufen
                                         SUPPORT           

  GET               `/api/tickets/:id`   ADMIN, SALES,     Ein Ticket
                                         SUPPORT           abrufen

  POST              `/api/tickets`       ADMIN, SUPPORT    Ticket erstellen

  PATCH             `/api/tickets/:id`   ADMIN, SALES,     Ticket
                                         SUPPORT           aktualisieren
  --------------------------------------------------------------------------

Tickets werden über ihren Status geschlossen und nicht gelöscht.

Unterstützte Filter:

``` text
GET /api/tickets?status=OPEN
GET /api/tickets?priority=URGENT
GET /api/tickets?assignedUserId=3
GET /api/tickets?page=1&limit=10
```

------------------------------------------------------------------------

## 6. Setup & Testing

### Voraussetzungen

Folgendes muss installiert sein:

-   Node.js
-   npm
-   PostgreSQL

### Installation

Nach dem Klonen des Repositorys werden die Abhängigkeiten installiert:

``` bash
npm install
```

### Umgebungsvariablen

Erstelle im Projektverzeichnis eine `.env`-Datei:

``` env
PORT=3000
DATABASE_URL="your_postgresql_connection_string"
JWT_SECRET="your_secret_key"
```

Die `.env`-Datei darf nicht committed werden und echte Zugangsdaten
dürfen nicht veröffentlicht werden.

### Datenbank-Setup

Wende die Prisma-Migrationen auf die lokale Entwicklungsdatenbank an:

``` bash
npx prisma migrate dev
```

Falls erforderlich, kann die Datenbank mit Seed-Daten befüllt werden:

``` bash
npm run seed
```

### API lokal starten

Starte den Server:

``` bash
npm start
```

Standardmäßig läuft die API unter:

``` text
http://localhost:3000
```

### Testing

Das Projekt verwendet **Jest** und **Supertest** für automatisierte
Tests.

Die Testsuite deckt unter anderem folgende Bereiche ab:

-   erfolgreiche Requests
-   Eingabevalidierung
-   Authentifizierung und Autorisierung
-   Rollenberechtigungen
-   Beziehungen und Business Rules
-   Filterung, Suche und Pagination
-   relevante Fehlerfälle

Alle Tests können mit folgendem Befehl ausgeführt werden:

``` bash
npm test
```

## 7. Deployment

Die API ist deployed und öffentlich erreichbar unter:

**Live API:** `https://crm-backend-kids.onrender.com`

Das Production Deployment verwendet dieselben REST Endpoints, die oben
dokumentiert sind.

------------------------------------------------------------------------

## 8. Projektdokumentation & Autorin

### Projekthintergrund

Dieses Projekt wurde als Bildungsprojekt im Bereich Backend-Entwicklung
am Digital Career Institute (DCI) entwickelt.

Das Design des CRM und seiner rollenbasierten Workflows wurde durch
meine eigene Berufserfahrung im Sales- und Customer-Support-Bereich
beeinflusst. Diese Erfahrung floss in die Entscheidungen über die
Verantwortlichkeiten der Rollen SALES und SUPPORT sowie darüber ein, wie
Unternehmen, Kontakte, Angebote, Rechnungen und Support-Tickets
miteinander zusammenhängen.

### Verwendung von KI

KI-Tools wurden in diesem Projekt als Lern- und
Entwicklungsunterstützung eingesetzt.

Ich habe KI verwendet, um Konzepte zu besprechen, Code zu überprüfen,
Probleme zu analysieren und verschiedene Implementierungsansätze besser
zu verstehen. Die Anwendungsstruktur, Business Rules und finalen
Implementierungsentscheidungen basieren auf meinem eigenen Verständnis
der Projektanforderungen sowie meiner bisherigen Erfahrung im Sales- und
Customer-Support-Bereich.

Für die automatisierten Tests habe ich zunächst selbst Tests
geschrieben, um den Testprozess zu lernen und zu verstehen. Anschließend
wurde Codex eingesetzt, um die Testsuite und die Testabdeckung zu
erweitern. Die daraus entstandenen Tests wurden von mir überprüft und
das Verhalten der API wurde verifiziert.

KI-generierte Vorschläge wurden überprüft, bevor sie in das Projekt
übernommen wurden. Ich blieb dafür verantwortlich, den verwendeten Code
zu verstehen, zu testen und erklären zu können.

### Autorin

**Iulia Roca**

Backend Development Project\
Digital Career Institute (DCI)
