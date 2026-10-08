# Silver Connect Backend

This is the core engine and secure API terminal for the **Silver Connect** caregiving ecosystem. It manages the global personnel registry, encrypted identity handshakes, and service deployment authorizations.

## Related Project

* **Frontend:** [Silver Connect Frontend](https://github.com/BatoolAmina/silver-connect)

## Architectural Features

* **Identity Handshake:** Robust JWT-based authentication with high-entropy Bcrypt password hashing.
* **RBAC (Role-Based Access Control):** Granular middleware protection ensuring specific access levels for **Admins**, **Helpers**, and **Users**.
* **Security Interceptors:** Pre-configured CORS handling and secure headers for cross-origin resource sharing.
* **Automated Identity Recovery:** Integrated **Nodemailer** protocol with cryptographic token generation for secure password resets.
* **Relational Logic:** Advanced Mongoose schema design utilizing `.populate()` to link Users, Bookings, and Performance Audits (Reviews).
* **Availability Scheduling:** Verified helpers publish dated visit windows; each window can be reserved by only one active booking.

## Technical Stack

* **Runtime:** Node.js
* **Framework:** Express.js
* **Database:** MongoDB via Mongoose ODM
* **Security:** JSON Web Tokens (JWT) & Crypto
* **Communication:** SMTP via Nodemailer

## Local Installation

1.  **Clone the Registry:**
    ```bash
    git clone https://github.com/batoolamina/silver-connect-backend.git
    cd silver-connect-backend
    ```

2.  **Install Dependencies:**
    ```bash
    npm install
    ```

3.  **Environment Configuration:**
    Create a `.env` file in the root directory and populate it with your credentials:
    ```env
    PORT=5000
    MONGO_URI=your_mongodb_connection_string
    JWT_SECRET=your_secure_jwt_secret
    EMAIL_USER=your_gmail_address
    EMAIL_PASS=your_gmail_app_password
    GOOGLE_CLIENT_ID=your_google_id
    GEMINI_API_KEY=your_gemini_api_key
    GEMINI_MODEL=gemini-flash-lite-latest
    ```

   Get a Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey). Keep it in the backend `.env` only; do not add it to the frontend environment. The assistant endpoint is `POST /api/assistant/chat` and accepts a `messages` array containing up to 8 `{ role, content }` entries.

4.  **Launch Terminal:**
    ```bash
    npm start
    ```

## API Reference (Core Endpoints)

### Authentication
| Method | Endpoint | Access | Function |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Create new identity |
| `POST` | `/api/auth/login` | Public | Identity verification & token grant |
| `POST` | `/api/auth/forgot-password` | Public | Dispatch recovery signal |
| `PUT` | `/api/auth/reset-password/:token` | Public | Update cipher via token |

### Operations
| Method | Endpoint | Access | Function |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/auth/verified-helpers` | Public | Retrieve verified specialists |
| `POST` | `/api/bookings/create` | Private | Authorize specialist dispatch |
| `PATCH` | `/api/bookings/:id/status` | Private | Update deployment status |

### Availability
| Method | Endpoint | Access | Function |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/availability/:helperId` | Public | List a verified helper's open visit windows |
| `GET` | `/api/availability/mine` | Helper | View published and reserved visit windows |
| `POST` | `/api/availability` | Verified helper | Publish a date and visit window |
| `DELETE` | `/api/availability/:id` | Helper | Remove an unreserved visit window |

Published helper windows appear as available to families. Families may also request another future date and time; these requests are subject to helper confirmation and cannot conflict with another pending or accepted request for the same window. Pending and accepted requests reserve a window; rejected or cancelled requests release it.

### Administrative
| Method | Endpoint | Access | Function |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/auth/admin/users` | Admin | Audit full registry |
| `POST` | `/api/auth/admin/verify-helper` | Admin | Approve specialist credentials |

---
Built with passion for the caregiving community.
